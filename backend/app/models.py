from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from .database import Base


class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, default="demo-user")
    role = Column(String(30), default="personal")
    food_name = Column(String(150), default="")
    category = Column(String(80), default="Other")
    quantity = Column(Float, default=1)
    unit = Column(String(30), default="pcs")
    purchase_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    storage_condition = Column(String(80), default="Room Temperature")
    shelf_life = Column(Integer, default=7)
    notes = Column(Text, default="")
    risk_label = Column(String(30), default="Safe")
    risk_score = Column(Float, default=0)
    recommendation = Column(Text, default="")
    is_finished = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Legacy columns kept so old local SQLite files and older code paths do not break.
    name = Column(String(150), nullable=True)
    risk_level = Column(String(30), nullable=True)


class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id = Column(Integer, primary_key=True, index=True)
    food_id = Column(Integer, nullable=True)
    user_id = Column(String(100), index=True, default="demo-user")
    role = Column(String(30), default="personal")
    food_name = Column(String(150), default="")
    category = Column(String(80), default="Other")
    quantity = Column(Float, default=1)
    unit = Column(String(30), default="pcs")
    price = Column(Float, default=0)
    original_price = Column(Float, default=0)
    discount_percentage = Column(Float, default=0)
    seller_name = Column(String(150), default="F.R.E.S.H User")
    location_name = Column(String(200), default="")
    latitude = Column(Float, default=-6.2088)
    longitude = Column(Float, default=106.8456)
    expiration_date = Column(Date, nullable=True)
    status = Column(String(30), default="Available")
    notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Legacy listing fields.
    title = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    type = Column(String(30), nullable=True)
    location = Column(String(150), nullable=True)


class DonationItem(Base):
    __tablename__ = "donation_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, default="demo-user")
    role = Column(String(30), default="personal")
    food_name = Column(String(150), default="")
    category = Column(String(80), default="Other")
    quantity = Column(Float, default=1)
    unit = Column(String(30), default="pcs")
    donor_name = Column(String(150), default="F.R.E.S.H Donor")
    pickup_location = Column(String(200), default="")
    latitude = Column(Float, default=-6.2088)
    longitude = Column(Float, default=106.8456)
    expiration_date = Column(Date, nullable=True)
    status = Column(String(30), default="Available")
    notes = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BusinessInventory(Base):
    __tablename__ = "business_inventory"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(100), index=True, default="demo-business")
    item_name = Column(String(150), default="")
    category = Column(String(80), default="Other")
    batch_code = Column(String(80), default="")
    quantity = Column(Float, default=1)
    unit = Column(String(30), default="pcs")
    supplier = Column(String(150), default="")
    purchase_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=True)
    branch = Column(String(150), default="")
    storage_area = Column(String(120), default="")
    cost_per_unit = Column(Float, default=0)
    selling_price = Column(Float, default=0)
    estimated_loss = Column(Float, default=0)
    risk_label = Column(String(30), default="Safe")
    risk_score = Column(Float, default=0)
    suggested_action = Column(Text, default="")
    status = Column(String(30), default="Safe")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BusinessOrder(Base):
    __tablename__ = "business_orders"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(100), index=True, default="demo-business")
    food_item = Column(String(150), default="")
    buyer = Column(String(150), default="")
    quantity = Column(Float, default=1)
    unit = Column(String(30), default="pcs")
    price = Column(Float, default=0)
    pickup_time = Column(String(80), default="")
    status = Column(String(30), default="Pending")
    branch = Column(String(150), default="")
    type = Column(String(30), default="sale")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BusinessBranch(Base):
    __tablename__ = "business_branches"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(String(100), index=True, default="demo-business")
    branch_name = Column(String(150), default="")
    location = Column(String(220), default="")
    latitude = Column(Float, default=-6.2088)
    longitude = Column(Float, default=106.8456)
    manager_name = Column(String(150), default="")
    contact = Column(String(80), default="")
    total_inventory = Column(Integer, default=0)
    high_risk_items = Column(Integer, default=0)
    waste_prevented = Column(Float, default=0)
    marketplace_listings = Column(Integer, default=0)
    status = Column(String(30), default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
