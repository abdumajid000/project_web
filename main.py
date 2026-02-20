import hashlib
import os
import secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import requests
from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

app = FastAPI(title="Lost & Found – Topilmalar idorasi")

ADMIN_PHONE = os.getenv("ADMIN_PHONE", "+998900000000")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
DEFAULT_CATEGORIES = ["Documents", "Electronics", "Keys", "Bags", "Pets", "Other"]
BASE_DIR = Path(__file__).parent

Base.metadata.create_all(bind=engine)


def _try_add_users_columns() -> None:
    with engine.connect() as con:
        cols = [r[1] for r in con.execute(text("PRAGMA table_info(users)"))]
        if "phone" not in cols:
            con.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR"))
        if "password_hash" not in cols:
            con.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR"))
        if "is_admin" not in cols:
            con.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
        con.commit()


_try_add_users_columns()


@app.on_event("startup")
def seed_categories() -> None:
    db = next(get_db())
    try:
        for name in DEFAULT_CATEGORIES:
            existing = db.query(models.Category).filter(models.Category.name == name).first()
            if not existing:
                db.add(models.Category(name=name))
        db.commit()
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()


app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
def home_page():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/create")
def create_page():
    return FileResponse(BASE_DIR / "static" / "create.html")


@app.get("/my")
def my_page():
    return FileResponse(BASE_DIR / "static" / "my.html")


@app.get("/auth")
def auth_page():
    return FileResponse(BASE_DIR / "static" / "auth.html")


@app.get("/admin/login")
def admin_login_page():
    return FileResponse(BASE_DIR / "static" / "admin_login.html")


@app.get("/admin")
def admin_page():
    return FileResponse(BASE_DIR / "static" / "admin.html")


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def send_telegram_code(telegram_id: str, code: str) -> None:
    if not BOT_TOKEN:
        return
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    text_message = f"Topilmalar idorasi tasdiqlash kodi: {code}"
    requests.post(url, json={"chat_id": telegram_id, "text": text_message}, timeout=8)


def create_session(user: models.User, db: Session) -> str:
    token = secrets.token_urlsafe(32)
    db.add(models.SessionToken(token=token, user_id=user.id))
    db.commit()
    return token


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authorization required")
    token = authorization.replace("Bearer ", "").strip()
    session = db.query(models.SessionToken).filter(models.SessionToken.token == token).first()
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    user = db.query(models.User).filter(models.User.id == session.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def ensure_admin(user: models.User):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")


@app.post("/auth/request-code", response_model=schemas.MessageOut)
def request_code(payload: schemas.PhoneCodeRequest, db: Session = Depends(get_db)):
    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    try:
        db.add(models.OTPCode(phone=payload.phone, code=code, purpose="login", expires_at=expires_at))
        db.commit()
        send_telegram_code(payload.telegram_id, code)
        return {"message": "Tasdiqlash kodi Telegram bot orqali yuborildi"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Kodni yuborishda xatolik")


@app.post("/auth/verify-code", response_model=schemas.MessageOut)
def verify_code(payload: schemas.VerifyCodeRequest, db: Session = Depends(get_db)):
    rec = (
        db.query(models.OTPCode)
        .filter(
            models.OTPCode.phone == payload.phone,
            models.OTPCode.code == payload.code,
            models.OTPCode.purpose == "login",
            models.OTPCode.is_used.is_(False),
        )
        .order_by(models.OTPCode.id.desc())
        .first()
    )
    if not rec or rec.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Kod yaroqsiz yoki muddati tugagan")

    try:
        user = db.query(models.User).filter(models.User.phone == payload.phone).first()
        if not user:
            user = models.User(
                phone=payload.phone,
                telegram_id=payload.telegram_id,
                full_name=payload.full_name,
                is_admin=payload.phone == ADMIN_PHONE,
            )
            db.add(user)
        else:
            user.telegram_id = payload.telegram_id
            user.full_name = payload.full_name
            user.is_admin = user.phone == ADMIN_PHONE

        rec.is_used = True
        db.commit()
        return {"message": "Telefon tasdiqlandi. Endi parol o'rnating yoki login qiling"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Tasdiqlashda xatolik")


@app.post("/auth/set-password", response_model=schemas.MessageOut)
def set_password(payload: schemas.SetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone == payload.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    try:
        user.password_hash = hash_password(payload.password)
        db.commit()
        return {"message": "Parol saqlandi"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Parolni saqlashda xatolik")


@app.post("/auth/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone == payload.phone).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")
    if user.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="Login yoki parol noto'g'ri")
    token = create_session(user, db)
    return {
        "token": token,
        "full_name": user.full_name,
        "phone": user.phone,
        "is_admin": user.is_admin,
    }


@app.post("/auth/forgot-password/request-code", response_model=schemas.MessageOut)
def forgot_password_request(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone == payload.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Bunday telefon topilmadi")
    code = str(secrets.randbelow(900000) + 100000)
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    try:
        db.add(models.OTPCode(phone=payload.phone, code=code, purpose="reset", expires_at=expires_at))
        db.commit()
        send_telegram_code(payload.telegram_id, code)
        return {"message": "Tiklash kodi Telegram bot orqali yuborildi"}
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Kod yuborilmadi")


@app.post("/auth/forgot-password/reset", response_model=schemas.MessageOut)
def forgot_password_reset(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    rec = (
        db.query(models.OTPCode)
        .filter(
            models.OTPCode.phone == payload.phone,
            models.OTPCode.code == payload.code,
            models.OTPCode.purpose == "reset",
            models.OTPCode.is_used.is_(False),
        )
        .order_by(models.OTPCode.id.desc())
        .first()
    )
    if not rec or rec.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Kod yaroqsiz yoki muddati tugagan")

    user = db.query(models.User).filter(models.User.phone == payload.phone).first()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    try:
        user.password_hash = hash_password(payload.new_password)
        rec.is_used = True
        db.commit()
        return {"message": "Parol yangilandi"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Parol yangilanmadi")


@app.get("/auth/me", response_model=schemas.UserOut)
def auth_me(user: models.User = Depends(get_current_user)):
    return user


@app.post("/users", response_model=schemas.UserOut)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        existing = None
        if payload.telegram_id:
            existing = db.query(models.User).filter(models.User.telegram_id == payload.telegram_id).first()
        if not existing and payload.phone:
            existing = db.query(models.User).filter(models.User.phone == payload.phone).first()
        if existing:
            return existing

        user = models.User(
            telegram_id=payload.telegram_id,
            full_name=payload.full_name,
            phone=payload.phone,
            is_admin=payload.phone == ADMIN_PHONE,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create user")


@app.get("/categories", response_model=list[schemas.CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.name.asc()).all()


@app.post("/admin/categories", response_model=schemas.CategoryOut)
def add_category(payload: schemas.CategoryCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_admin(user)
    exists = db.query(models.Category).filter(models.Category.name == payload.name.strip()).first()
    if exists:
        raise HTTPException(status_code=400, detail="Category already exists")
    try:
        category = models.Category(name=payload.name.strip())
        db.add(category)
        db.commit()
        db.refresh(category)
        return category
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to add category")


@app.post("/items", response_model=schemas.MessageOut)
def create_item(payload: schemas.ItemCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        category = db.query(models.Category).filter(models.Category.id == payload.category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")

        item = models.Item(
            title=payload.title.strip(),
            description=payload.description.strip(),
            category_id=payload.category_id,
            region=payload.region.strip(),
            type=payload.type,
            contact=payload.contact.strip(),
            status="pending",
            user_id=user.id,
        )
        db.add(item)
        db.commit()
        return {"message": "Announcement created and waiting for admin approval"}
    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to create announcement")


def map_item(item: models.Item) -> schemas.ItemOut:
    return schemas.ItemOut(
        id=item.id,
        title=item.title,
        description=item.description,
        category_id=item.category_id,
        category_name=item.category.name,
        region=item.region,
        type=item.type,
        contact=item.contact,
        status=item.status,
        user_id=item.user_id,
        telegram_id=item.user.telegram_id,
        created_at=item.created_at,
    )


@app.get("/items", response_model=list[schemas.ItemOut])
def get_items(
    region: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(models.Item).filter(models.Item.status == "approved")
    if region:
        query = query.filter(models.Item.region == region)
    if type:
        if type not in {"lost", "found"}:
            raise HTTPException(status_code=400, detail="Type must be lost or found")
        query = query.filter(models.Item.type == type)
    items = query.order_by(models.Item.created_at.desc()).all()
    return [map_item(item) for item in items]


@app.get("/items/my", response_model=list[schemas.ItemOut])
def get_my_items(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(models.Item)
        .filter(models.Item.user_id == user.id)
        .order_by(models.Item.created_at.desc())
        .all()
    )
    return [map_item(item) for item in items]


@app.get("/admin/pending", response_model=list[schemas.ItemOut])
def get_pending_items(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_admin(user)
    items = (
        db.query(models.Item)
        .filter(models.Item.status == "pending")
        .order_by(models.Item.created_at.asc())
        .all()
    )
    return [map_item(item) for item in items]


@app.post("/admin/approve/{item_id}", response_model=schemas.MessageOut)
def approve_item(item_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_admin(user)
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")
    try:
        item.status = "approved"
        db.commit()
        return {"message": "Announcement approved"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to approve announcement")


@app.delete("/admin/delete/{item_id}", response_model=schemas.MessageOut)
def delete_item(item_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    ensure_admin(user)
    item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Announcement not found")
    try:
        db.delete(item)
        db.commit()
        return {"message": "Announcement deleted"}
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete announcement")
