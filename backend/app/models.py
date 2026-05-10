from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, Boolean
from sqlalchemy.sql import func
from .database import Base

class FoodItem(Base):
    __tablename__ = "food_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, default="demo-user")
    name = Column(String(150), nullable=False)
    category = Column(String(80), default="General")
    quantity = Column(Float, default=1)
    unit = Column(String(30), default="pcs")
    purchase_date = Column(Date, nullable=True)
    expiration_date = Column(Date, nullable=False)
    storage_condition = Column(String(80), default="Room Temperature")
    shelf_life = Column(Integer, default=7)
    risk_level = Column(String(30), default="Unknown")
    risk_score = Column(Float, default=0)
    recommendation = Column(Text, default="")
    is_finished = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MarketplaceListing(Base):
    __tablename__ = "marketplace_listings"

    id = Column(Integer, primary_key=True, index=True)
    food_id = Column(Integer, nullable=True)
    user_id = Column(String(100), index=True, default="demo-user")
    title = Column(String(150), nullable=False)
    description = Column(Text, default="")
    type = Column(String(30), default="donation")  # donation / sale
    price = Column(Float, default=0)
    location = Column(String(150), default="")
    status = Column(String(30), default="active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
