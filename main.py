import os
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db

app = FastAPI(title="Lost & Found – Topilmalar idorasi")

ADMIN_TELEGRAM_ID = os.getenv("ADMIN_TELEGRAM_ID", "1000000000")
DEFAULT_CATEGORIES = [
    "Documents",
    "Electronics",
    "Keys",
    "Bags",
    "Pets",
    "Other",
]

Base.metadata.create_all(bind=engine)


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


BASE_DIR = Path(__file__).parent


@app.get("/")
def home_page():
    return FileResponse(BASE_DIR / "static" / "index.html")


@app.get("/create")
def create_page():
    return FileResponse(BASE_DIR / "static" / "create.html")


@app.get("/my")
def my_page():
    return FileResponse(BASE_DIR / "static" / "my.html")


@app.get("/admin")
def admin_page():
    return FileResponse(BASE_DIR / "static" / "admin.html")


@app.post("/users", response_model=schemas.UserOut)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        existing = db.query(models.User).filter(models.User.telegram_id == payload.telegram_id).first()
        if existing:
            return existing
        user = models.User(telegram_id=payload.telegram_id, full_name=payload.full_name)
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
def add_category(payload: schemas.CategoryCreate, telegram_id: str, db: Session = Depends(get_db)):
    if telegram_id != ADMIN_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Admin access required")
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
def create_item(payload: schemas.ItemCreate, db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.telegram_id == payload.telegram_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found. Create user first.")

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
def get_my_items(telegram_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.telegram_id == telegram_id).first()
    if not user:
        return []
    items = (
        db.query(models.Item)
        .filter(models.Item.user_id == user.id)
        .order_by(models.Item.created_at.desc())
        .all()
    )
    return [map_item(item) for item in items]


@app.get("/admin/pending", response_model=list[schemas.ItemOut])
def get_pending_items(telegram_id: str, db: Session = Depends(get_db)):
    if telegram_id != ADMIN_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Admin access required")
    items = (
        db.query(models.Item)
        .filter(models.Item.status == "pending")
        .order_by(models.Item.created_at.asc())
        .all()
    )
    return [map_item(item) for item in items]


@app.post("/admin/approve/{item_id}", response_model=schemas.MessageOut)
def approve_item(item_id: int, telegram_id: str, db: Session = Depends(get_db)):
    if telegram_id != ADMIN_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Admin access required")
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
def delete_item(item_id: int, telegram_id: str, db: Session = Depends(get_db)):
    if telegram_id != ADMIN_TELEGRAM_ID:
        raise HTTPException(status_code=403, detail="Admin access required")
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
