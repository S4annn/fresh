from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, EmailStr


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


# User Management Schemas
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field(default="personal", pattern="^(personal|business)$")
    business_name: Optional[str] = Field(None, max_length=150)
    business_type: Optional[str] = Field(None, max_length=100)
    business_location: Optional[str] = Field(None, max_length=200)
    contact_number: Optional[str] = Field(None, max_length=50)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    uid: str
    name: str
    email: str
    role: str
    provider: str
    business_name: Optional[str] = None
    business_type: Optional[str] = None
    business_location: Optional[str] = None
    contact_number: Optional[str] = None
    is_active: bool
    email_verified: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    user_id: Optional[int] = None
    uid: Optional[str] = None


class UserSubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: int
    plan_id: str
    is_demo: bool
    usage_data: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# Subscription Schemas
class SubscriptionCreate(BaseModel):
    user_id: str = "demo-user"
    plan_id: str = "free"
    plan_name: str = "Free Starter"
    status: str = "active"
    billing_cycle: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[str] = None
    plan_name: Optional[str] = None
    status: Optional[str] = None
    billing_cycle: Optional[str] = None
    expires_at: Optional[datetime] = None


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: str
    plan_id: str
    plan_name: str
    status: str
    billing_cycle: Optional[str] = None
    started_at: datetime
    expires_at: Optional[datetime] = None
    ai_scans_this_month: int = 0
    inventory_items_count: int = 0
    marketplace_listings_count: int = 0
    donation_listings_count: int = 0
    created_at: datetime
    updated_at: datetime


# Scan History Schemas
class ScanHistoryCreate(BaseModel):
    user_id: str = "demo-user"
    detected_food: str
    category: str
    confidence: float = 0.0
    source: str = "vision_model"
    image_filename: Optional[str] = None
    top_predictions_json: Optional[str] = None


class ScanHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: str
    detected_food: str
    category: str
    confidence: float
    source: str
    image_filename: Optional[str] = None
    top_predictions_json: Optional[str] = None
    created_at: datetime


# Business Schemas (enhanced for PostgreSQL)
class BusinessInventoryCreate(BaseModel):
    business_id: str = "demo-business"
    item_name: str
    category: str = "Other"
    batch_code: str = ""
    quantity: float = 1
    unit: str = "pcs"
    supplier: str = ""
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    branch: str = ""
    storage_area: str = ""
    cost_per_unit: float = 0
    selling_price: float = 0
    estimated_loss: float = 0


class BusinessInventoryUpdate(BaseModel):
    item_name: Optional[str] = None
    category: Optional[str] = None
    batch_code: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    supplier: Optional[str] = None
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    branch: Optional[str] = None
    storage_area: Optional[str] = None
    cost_per_unit: Optional[float] = None
    selling_price: Optional[float] = None
    estimated_loss: Optional[float] = None
    risk_label: Optional[str] = None
    risk_score: Optional[float] = None
    suggested_action: Optional[str] = None
    status: Optional[str] = None


class BusinessInventoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    business_id: str
    item_name: str
    category: str
    batch_code: str
    quantity: float
    unit: str
    supplier: str
    purchase_date: Optional[date] = None
    expiration_date: Optional[date] = None
    branch: str
    storage_area: str
    cost_per_unit: float
    selling_price: float
    estimated_loss: float
    risk_label: str
    risk_score: float
    suggested_action: str
    status: str
    created_at: datetime


class BusinessOrderUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class BusinessBranchCreate(BaseModel):
    business_id: str = "demo-business"
    branch_name: str
    location: str
    latitude: float = -6.2088
    longitude: float = 106.8456
    manager_name: str = ""
    contact: str = ""


class BusinessBranchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    business_id: str
    branch_name: str
    location: str
    latitude: float
    longitude: float
    manager_name: str
    contact: str
    total_inventory: int
    high_risk_items: int
    waste_prevented: float
    marketplace_listings: int
    status: str
    created_at: datetime


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
