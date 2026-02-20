from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    telegram_id: Optional[str] = Field(default=None, min_length=1, max_length=100)
    full_name: str = Field(min_length=1, max_length=100)
    phone: Optional[str] = Field(default=None, min_length=7, max_length=20)


class UserOut(BaseModel):
    id: int
    telegram_id: Optional[str]
    full_name: str
    phone: Optional[str]
    is_admin: bool

    model_config = {"from_attributes": True}


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)


class CategoryOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=150)
    description: str = Field(min_length=1)
    category_id: int
    region: str = Field(min_length=1, max_length=50)
    type: Literal["lost", "found"]
    contact: str = Field(min_length=1, max_length=200)


class ItemOut(BaseModel):
    id: int
    title: str
    description: str
    category_id: int
    category_name: str
    region: str
    type: str
    contact: str
    status: str
    user_id: int
    telegram_id: Optional[str]
    created_at: datetime


class MessageOut(BaseModel):
    message: str


class PhoneCodeRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    telegram_id: str = Field(min_length=1, max_length=100)


class VerifyCodeRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    code: str = Field(min_length=4, max_length=10)
    full_name: str = Field(min_length=1, max_length=100)
    telegram_id: str = Field(min_length=1, max_length=100)


class SetPasswordRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=4, max_length=100)


class LoginRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    password: str = Field(min_length=4, max_length=100)


class TokenOut(BaseModel):
    token: str
    full_name: str
    phone: Optional[str]
    is_admin: bool


class ForgotPasswordRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    telegram_id: str = Field(min_length=1, max_length=100)


class ResetPasswordRequest(BaseModel):
    phone: str = Field(min_length=7, max_length=20)
    code: str = Field(min_length=4, max_length=10)
    new_password: str = Field(min_length=4, max_length=100)
