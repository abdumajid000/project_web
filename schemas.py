from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    telegram_id: str = Field(min_length=1, max_length=100)
    full_name: str = Field(min_length=1, max_length=100)


class UserOut(BaseModel):
    id: int
    telegram_id: str
    full_name: str

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
    telegram_id: str = Field(min_length=1, max_length=100)


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
    telegram_id: str
    created_at: datetime


class MessageOut(BaseModel):
    message: str
