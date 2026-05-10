from datetime import date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PredictInput(BaseModel):
    food_name: str = "Food Item"
    category: str = "Other"
    quantity: float = Field(1, ge=0)
    unit: str = "pcs"
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    days_to_expiry: Optional[int] = None
    storage_condition: Optional[str] = None
    storage_type: Optional[str] = None
    shelf_life: Optional[int] = None
    usage_frequency: Optional[str | int | float] = None
    role: str = "personal"


class FoodCreate(BaseModel):
    user_id: str = "demo-user"
    role: str = "personal"
    food_name: str = "Food Item"
    name: Optional[str] = None
    category: str = "Other"
    quantity: float = 1
    unit: str = "pcs"
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    days_to_expiry: Optional[int] = None
    storage_condition: Optional[str] = None
    storage_type: Optional[str] = None
    shelf_life: Optional[int] = None
    notes: str = ""


class FoodUpdate(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
    food_name: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    days_to_expiry: Optional[int] = None
    storage_condition: Optional[str] = None
    storage_type: Optional[str] = None
    shelf_life: Optional[int] = None
    notes: Optional[str] = None
    is_finished: Optional[bool] = None


class MarketplaceCreate(BaseModel):
    user_id: str = "demo-user"
    role: str = "personal"
    food_name: str = "Surplus Food"
    category: str = "Other"
    quantity: float = 1
    unit: str = "pcs"
    price: float = 0
    original_price: float = 0
    discount_percentage: Optional[float] = None
    seller_name: str = "F.R.E.S.H User"
    location_name: str = "Jakarta"
    latitude: float = -6.2088
    longitude: float = 106.8456
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: str = "Available"
    notes: str = ""
    food_id: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    type: str = "sale"
    location: Optional[str] = None


class MarketplaceUpdate(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
    food_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    discount_percentage: Optional[float] = None
    seller_name: Optional[str] = None
    location_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    location: Optional[str] = None


class DonationCreate(BaseModel):
    user_id: str = "demo-user"
    role: str = "personal"
    food_name: str = "Food Donation"
    category: str = "Other"
    quantity: float = 1
    unit: str = "pcs"
    donor_name: str = "F.R.E.S.H Donor"
    pickup_location: str = "Jakarta"
    latitude: float = -6.2088
    longitude: float = 106.8456
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: str = "Available"
    notes: str = ""


class DonationUpdate(BaseModel):
    user_id: Optional[str] = None
    role: Optional[str] = None
    food_name: Optional[str] = None
    category: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    donor_name: Optional[str] = None
    pickup_location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class BusinessInventoryCreate(BaseModel):
    business_id: str = "demo-business"
    item_name: str = "Stock Item"
    category: str = "Other"
    batch_code: str = ""
    quantity: float = 1
    unit: str = "pcs"
    supplier: str = ""
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    branch: str = ""
    storage_area: str = ""
    cost_per_unit: float = 0
    selling_price: float = 0
    estimated_loss: Optional[float] = None
    risk_label: Optional[str] = None
    risk_score: Optional[float] = None
    suggested_action: Optional[str] = None
    status: Optional[str] = None


class BusinessInventoryUpdate(BaseModel):
    business_id: Optional[str] = None
    item_name: Optional[str] = None
    category: Optional[str] = None
    batch_code: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    supplier: Optional[str] = None
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    branch: Optional[str] = None
    storage_area: Optional[str] = None
    cost_per_unit: Optional[float] = None
    selling_price: Optional[float] = None
    estimated_loss: Optional[float] = None
    risk_label: Optional[str] = None
    risk_score: Optional[float] = None
    suggested_action: Optional[str] = None
    status: Optional[str] = None


class BusinessOrderUpdate(BaseModel):
    status: str = "Pending"


class BusinessBranchCreate(BaseModel):
    business_id: str = "demo-business"
    branch_name: str = "F.R.E.S.H Branch"
    location: str = "Jakarta"
    latitude: float = -6.2088
    longitude: float = 106.8456
    manager_name: str = ""
    contact: str = ""
    total_inventory: int = 0
    high_risk_items: int = 0
    waste_prevented: float = 0
    marketplace_listings: int = 0
    status: str = "Active"


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
