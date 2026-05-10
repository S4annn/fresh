from datetime import date, datetime
from pydantic import BaseModel, Field

class PredictInput(BaseModel):
    food_name: str = Field(..., examples=["Susu"])
    category: str = Field("Dairy", examples=["Dairy"])
    quantity: float = Field(1, ge=0)
    unit: str = "pcs"
    purchase_date: date | None = None
    expiration_date: date
    storage_condition: str = "Refrigerated"
    shelf_life: int | None = None

class PredictOutput(BaseModel):
    food_name: str
    category: str
    days_to_expiry: int
    risk_level: str
    risk_score: float
    recommendation: str

class FoodCreate(PredictInput):
    user_id: str = "demo-user"

class FoodUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    quantity: float | None = None
    unit: str | None = None
    purchase_date: date | None = None
    expiration_date: date | None = None
    storage_condition: str | None = None
    shelf_life: int | None = None
    is_finished: bool | None = None

class FoodOut(BaseModel):
    id: int
    user_id: str
    name: str
    category: str
    quantity: float
    unit: str
    purchase_date: date | None
    expiration_date: date
    storage_condition: str
    shelf_life: int
    risk_level: str
    risk_score: float
    recommendation: str
    is_finished: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ListingCreate(BaseModel):
    food_id: int | None = None
    user_id: str = "demo-user"
    title: str
    description: str = ""
    type: str = "donation"
    price: float = 0
    location: str = ""

class ListingOut(BaseModel):
    id: int
    food_id: int | None
    user_id: str
    title: str
    description: str
    type: str
    price: float
    location: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
