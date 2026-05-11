"""
Subscription service for PostgreSQL database management
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from .models import Subscription
from .schemas import SubscriptionCreate, SubscriptionResponse, SubscriptionUpdate


def get_user_subscription(db: Session, user_id: str) -> Optional[Subscription]:
    """Get user subscription from database"""
    return db.query(Subscription).filter(Subscription.user_id == user_id).first()


def create_default_subscription(db: Session, user_id: str, role: str = "personal") -> Subscription:
    """Create default subscription for user"""
    if role == "business":
        plan_id = "business_pro"
        plan_name = "Business Pro"
    else:
        plan_id = "free"
        plan_name = "Free Starter"
    
    subscription = Subscription(
        user_id=user_id,
        plan_id=plan_id,
        plan_name=plan_name,
        status="active",
        started_at=datetime.utcnow()
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


def get_or_create_subscription(db: Session, user_id: str, role: str = "personal") -> Subscription:
    """Get existing subscription or create default one"""
    subscription = get_user_subscription(db, user_id)
    
    if not subscription:
        subscription = create_default_subscription(db, user_id, role)
    
    return subscription


def upgrade_subscription(db: Session, user_id: str, plan_id: str) -> Subscription:
    """Upgrade user subscription plan"""
    subscription = get_user_subscription(db, user_id)
    
    if not subscription:
        subscription = create_default_subscription(db, user_id)
    
    # Plan configurations
    plan_configs = {
        "free": {"name": "Free Starter", "expires_days": None},
        "personal_plus": {"name": "Personal Plus", "expires_days": 365},
        "business_pro": {"name": "Business Pro", "expires_days": 365},
    }
    
    config = plan_configs.get(plan_id, plan_configs["free"])
    
    subscription.plan_id = plan_id
    subscription.plan_name = config["name"]
    subscription.status = "active"
    subscription.updated_at = datetime.utcnow()
    
    if config["expires_days"]:
        subscription.expires_at = datetime.utcnow() + timedelta(days=config["expires_days"])
        subscription.billing_cycle = "yearly"
    else:
        subscription.expires_at = None
        subscription.billing_cycle = None
    
    db.commit()
    db.refresh(subscription)
    return subscription


def cancel_subscription(db: Session, user_id: str) -> Subscription:
    """Cancel user subscription"""
    subscription = get_user_subscription(db, user_id)
    
    if subscription:
        subscription.status = "cancelled"
        subscription.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(subscription)
    
    return subscription


def increment_usage(db: Session, user_id: str, usage_type: str) -> Subscription:
    """Increment subscription usage counter"""
    subscription = get_or_create_subscription(db, user_id)
    
    if usage_type == "ai_scans_this_month":
        subscription.ai_scans_this_month += 1
    elif usage_type == "inventory_items_count":
        subscription.inventory_items_count += 1
    elif usage_type == "marketplace_listings_count":
        subscription.marketplace_listings_count += 1
    elif usage_type == "donation_listings_count":
        subscription.donation_listings_count += 1
    
    subscription.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(subscription)
    return subscription


def get_subscription_limits(db: Session, user_id: str) -> Dict[str, Any]:
    """Get subscription limits for user"""
    subscription = get_or_create_subscription(db, user_id)
    
    # Plan limits
    plan_limits = {
        "free": {
            "max_inventory_items": 30,
            "max_ai_scans_per_month": 5,
            "max_marketplace_listings": 3,
            "max_donation_listings": 2,
        },
        "personal_plus": {
            "max_inventory_items": 200,
            "max_ai_scans_per_month": 50,
            "max_marketplace_listings": 20,
            "max_donation_listings": 15,
        },
        "business_pro": {
            "max_inventory_items": 1000,
            "max_ai_scans_per_month": 200,
            "max_marketplace_listings": 100,
            "max_donation_listings": 50,
        },
    }
    
    limits = plan_limits.get(subscription.plan_id, plan_limits["free"])
    
    return {
        "plan_id": subscription.plan_id,
        "plan_name": subscription.plan_name,
        "status": subscription.status,
        "limits": limits,
        "usage": {
            "ai_scans_this_month": subscription.ai_scans_this_month,
            "inventory_items_count": subscription.inventory_items_count,
            "marketplace_listings_count": subscription.marketplace_listings_count,
            "donation_listings_count": subscription.donation_listings_count,
        },
        "expires_at": subscription.expires_at.isoformat() if subscription.expires_at else None,
    }


def check_usage_limit(db: Session, user_id: str, usage_type: str, current_count: int) -> bool:
    """Check if user has exceeded usage limit"""
    limits_data = get_subscription_limits(db, user_id)
    limits = limits_data["limits"]
    
    limit_key = f"max_{usage_type}"
    limit = limits.get(limit_key, float('inf'))
    
    return current_count < limit
