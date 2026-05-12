from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    uid = Column(String(100), unique=True, index=True, nullable=False)
    name = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), default="personal")
    provider = Column(String(30), default="local")
    business_name = Column(String(150), nullable=True)
    business_type = Column(String(100), nullable=True)
    business_location = Column(String(200), nullable=True)
    contact_number = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False)
    status = Column(String(50), default="pending_verification")
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("UserSubscription", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="sessions")


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(String(50), nullable=False)
    is_demo = Column(Boolean, default=False)
    usage_data = Column(Text, nullable=True)  # JSON string
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")


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


class MarketplaceReservation(Base):
    __tablename__ = "marketplace_reservations"

    id = Column(Integer, primary_key=True, index=True)
    marketplace_item_id = Column(Integer, ForeignKey("marketplace_listings.id"), nullable=False)
    seller_user_id = Column(String(100), index=True, nullable=False)
    requester_user_id = Column(String(100), index=True, nullable=False)
    requester_name = Column(String(150), default="")
    requester_email = Column(String(150), default="")
    message = Column(Text, default="")
    quantity_requested = Column(Float, default=1)
    status = Column(String(30), default="pending")  # pending, accepted, rejected, cancelled, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class DonationRequest(Base):
    __tablename__ = "donation_requests"

    id = Column(Integer, primary_key=True, index=True)
    donation_item_id = Column(Integer, ForeignKey("donation_items.id"), nullable=False)
    donor_user_id = Column(String(100), index=True, nullable=False)
    requester_user_id = Column(String(100), index=True, nullable=False)
    requester_name = Column(String(150), default="")
    requester_email = Column(String(150), default="")
    organization_name = Column(String(150), default="")
    message = Column(Text, default="")
    quantity_requested = Column(Float, default=1)
    pickup_time = Column(String(100), default="")
    status = Column(String(30), default="pending")  # pending, accepted, rejected, cancelled, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


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


class Subscription(Base):
    """Enhanced subscription model for PostgreSQL migration"""
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, default="demo-user")
    plan_id = Column(String(50), nullable=False, default="free")
    plan_name = Column(String(100), nullable=False, default="Free Starter")
    status = Column(String(30), nullable=False, default="active")
    billing_cycle = Column(String(20), nullable=True)  # monthly, yearly, trial
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Usage counters
    ai_scans_this_month = Column(Integer, default=0)
    inventory_items_count = Column(Integer, default=0)
    marketplace_listings_count = Column(Integer, default=0)
    donation_listings_count = Column(Integer, default=0)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ScanHistory(Base):
    """Scan history model for PostgreSQL migration"""
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100), index=True, default="demo-user")
    detected_food = Column(String(150), nullable=False)
    category = Column(String(80), nullable=False)
    confidence = Column(Float, default=0.0)
    source = Column(String(50), default="vision_model")  # vision_model, manual, etc.
    image_filename = Column(String(255), nullable=True)
    top_predictions_json = Column(Text, nullable=True)  # JSON string of top predictions
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EmailOTP(Base):
    __tablename__ = "email_otps"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), index=True, nullable=False)
    otp_hash = Column(String(255), nullable=False)
    purpose = Column(String(50), default="register")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempt_count = Column(Integer, default=0)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

