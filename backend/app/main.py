from __future__ import annotations

import os
from datetime import date, timedelta
from typing import Iterable

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import create_db_and_tables, get_db
from .ml import model_metadata, predict_food_risk
from .models import (
    BusinessBranch,
    BusinessInventory,
    BusinessOrder,
    DonationItem,
    FoodItem,
    MarketplaceListing,
)
from .schemas import (
    BusinessBranchCreate,
    BusinessInventoryCreate,
    BusinessInventoryUpdate,
    BusinessOrderUpdate,
    DonationCreate,
    DonationUpdate,
    FoodCreate,
    FoodUpdate,
    MarketplaceCreate,
    MarketplaceUpdate,
    PredictInput,
)
from .vision_model import (
    ARTIFACTS_DIR,
    LABELS_PATH,
    METADATA_PATH,
    MODEL_PATH,
    debug_labels_info,
    debug_model_info,
    load_assets,
    predict_food_from_image,
    vision_model_status,
)

create_db_and_tables()

app = FastAPI(
    title="F.R.E.S.H API",
    description="Backend API for F.R.E.S.H food waste reduction MVP.",
    version="1.0.0",
)

origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def load_vision_model_on_startup():
    load_assets()


def _today_plus(days: int) -> date:
    return date.today() + timedelta(days=days)


def _as_expiration_date(expiration_date=None, expiry_date=None, days_to_expiry=None) -> date:
    if expiration_date:
        return expiration_date
    if expiry_date:
        return expiry_date
    return _today_plus(5 if days_to_expiry is None else int(days_to_expiry))


def _storage(payload) -> str:
    return (
        getattr(payload, "storage_condition", None)
        or getattr(payload, "storage_type", None)
        or "Room Temperature"
    )


def _discount(price: float, original_price: float, explicit: float | None = None) -> float:
    if explicit is not None:
        return round(float(explicit), 2)
    if original_price and original_price > 0:
        return round(max(0, (original_price - price) / original_price * 100), 2)
    return 0


def _serialize_food(item: FoodItem) -> dict:
    food_name = item.food_name or item.name or "Food Item"
    risk_label = item.risk_label or item.risk_level or "Safe"
    return {
        "id": item.id,
        "user_id": item.user_id,
        "role": item.role or "personal",
        "food_name": food_name,
        "name": food_name,
        "category": item.category or "Other",
        "quantity": item.quantity or 0,
        "unit": item.unit or "pcs",
        "purchase_date": item.purchase_date,
        "expiration_date": item.expiration_date,
        "expiry_date": item.expiration_date,
        "storage_condition": item.storage_condition or "Room Temperature",
        "storage_type": item.storage_condition or "Room Temperature",
        "shelf_life": item.shelf_life or 7,
        "notes": item.notes or "",
        "risk_label": risk_label,
        "risk_level": risk_label,
        "risk_score": item.risk_score or 0,
        "recommendation": item.recommendation or "",
        "is_finished": bool(item.is_finished),
        "created_at": item.created_at,
    }


def _serialize_marketplace(item: MarketplaceListing) -> dict:
    food_name = item.food_name or item.title or "Surplus Food"
    location_name = item.location_name or item.location or "Jakarta"
    notes = item.notes or item.description or ""
    status = item.status or "Available"
    if status == "active":
        status = "Available"
    return {
        "id": item.id,
        "food_id": item.food_id,
        "user_id": item.user_id,
        "role": item.role or "personal",
        "food_name": food_name,
        "title": item.title or food_name,
        "category": item.category or "Other",
        "quantity": item.quantity or 0,
        "unit": item.unit or "pcs",
        "price": item.price or 0,
        "original_price": item.original_price or 0,
        "discount_percentage": item.discount_percentage or 0,
        "seller_name": item.seller_name or "F.R.E.S.H User",
        "seller": item.seller_name or "F.R.E.S.H User",
        "location_name": location_name,
        "location": location_name,
        "latitude": item.latitude,
        "longitude": item.longitude,
        "expiration_date": item.expiration_date,
        "expiry_date": item.expiration_date,
        "status": status,
        "notes": notes,
        "description": notes,
        "type": item.type or "sale",
        "created_at": item.created_at,
    }


def _serialize_donation(item: DonationItem) -> dict:
    return {
        "id": item.id,
        "user_id": item.user_id,
        "role": item.role or "personal",
        "food_name": item.food_name or "Food Donation",
        "category": item.category or "Other",
        "quantity": item.quantity or 0,
        "unit": item.unit or "pcs",
        "donor_name": item.donor_name or "F.R.E.S.H Donor",
        "pickup_location": item.pickup_location or "Jakarta",
        "latitude": item.latitude,
        "longitude": item.longitude,
        "expiration_date": item.expiration_date,
        "expiry_date": item.expiration_date,
        "status": item.status or "Available",
        "notes": item.notes or "",
        "created_at": item.created_at,
    }


def _serialize_business_inventory(item: BusinessInventory) -> dict:
    return {
        "id": item.id,
        "business_id": item.business_id,
        "item_name": item.item_name,
        "category": item.category,
        "batch_code": item.batch_code,
        "quantity": item.quantity,
        "unit": item.unit,
        "supplier": item.supplier,
        "purchase_date": item.purchase_date,
        "expiration_date": item.expiration_date,
        "expiry_date": item.expiration_date,
        "branch": item.branch,
        "storage_area": item.storage_area,
        "cost_per_unit": item.cost_per_unit,
        "selling_price": item.selling_price,
        "estimated_loss": item.estimated_loss,
        "risk_label": item.risk_label,
        "risk_level": item.risk_label,
        "risk_score": item.risk_score,
        "suggested_action": item.suggested_action,
        "status": item.status,
        "created_at": item.created_at,
    }


def _serialize_branch(item: BusinessBranch) -> dict:
    return {
        "id": item.id,
        "business_id": item.business_id,
        "branch_name": item.branch_name,
        "location": item.location,
        "latitude": item.latitude,
        "longitude": item.longitude,
        "manager_name": item.manager_name,
        "contact": item.contact,
        "total_inventory": item.total_inventory,
        "high_risk_items": item.high_risk_items,
        "waste_prevented": item.waste_prevented,
        "marketplace_listings": item.marketplace_listings,
        "status": item.status,
        "created_at": item.created_at,
    }


def _json(data):
    return jsonable_encoder(data)


def _add_all_if_empty(db: Session, model, rows: Iterable[dict], meaningful_field: str | None = None) -> None:
    query = db.query(model)
    if meaningful_field:
        query = query.filter(getattr(model, meaningful_field) != None, getattr(model, meaningful_field) != "")
    if query.count() > 0:
        return
    for row in rows:
        db.add(model(**row))
    db.commit()


def seed_marketplace(db: Session) -> None:
    rows = [
        {
            "food_name": "Surplus Banana",
            "category": "Fruit",
            "quantity": 8,
            "unit": "pcs",
            "price": 8000,
            "original_price": 16000,
            "discount_percentage": 50,
            "seller_name": "Fresh User Kemang",
            "location_name": "Kemang, Jakarta Selatan",
            "latitude": -6.2607,
            "longitude": 106.8131,
            "expiration_date": _today_plus(1),
            "status": "Available",
            "notes": "Banana matang, cocok untuk smoothie atau banana bread.",
            "title": "Surplus Banana",
            "description": "Banana matang, cocok untuk smoothie atau banana bread.",
            "type": "sale",
            "location": "Kemang, Jakarta Selatan",
        },
        {
            "food_name": "Discounted Bread",
            "category": "Bakery",
            "quantity": 3,
            "unit": "pack",
            "price": 10000,
            "original_price": 22000,
            "discount_percentage": 54.55,
            "seller_name": "Bakery Corner Tebet",
            "location_name": "Tebet, Jakarta Selatan",
            "latitude": -6.2264,
            "longitude": 106.8589,
            "expiration_date": _today_plus(2),
            "status": "Available",
            "notes": "Roti gandum masih tersegel.",
            "title": "Discounted Bread",
            "description": "Roti gandum masih tersegel.",
            "type": "sale",
            "location": "Tebet, Jakarta Selatan",
        },
        {
            "food_name": "Fresh Tomato Box",
            "category": "Vegetable",
            "quantity": 2,
            "unit": "kg",
            "price": 12000,
            "original_price": 24000,
            "discount_percentage": 50,
            "seller_name": "Kebun Segar Bogor",
            "location_name": "Pajajaran, Bogor",
            "latitude": -6.5971,
            "longitude": 106.8060,
            "expiration_date": _today_plus(3),
            "status": "Available",
            "notes": "Tomat segar untuk saus, salad, atau sup.",
            "title": "Fresh Tomato Box",
            "description": "Tomat segar untuk saus, salad, atau sup.",
            "type": "sale",
            "location": "Pajajaran, Bogor",
        },
        {
            "food_name": "Yogurt Pack",
            "category": "Dairy",
            "quantity": 6,
            "unit": "cup",
            "price": 18000,
            "original_price": 36000,
            "discount_percentage": 50,
            "seller_name": "Healthy Store Bekasi",
            "location_name": "Ahmad Yani, Bekasi",
            "latitude": -6.2349,
            "longitude": 106.9896,
            "expiration_date": _today_plus(4),
            "status": "Available",
            "notes": "Yogurt plain mendekati expiry, masih dingin.",
            "title": "Yogurt Pack",
            "description": "Yogurt plain mendekati expiry, masih dingin.",
            "type": "sale",
            "location": "Ahmad Yani, Bekasi",
        },
        {
            "food_name": "Lettuce Bundle",
            "category": "Vegetable",
            "quantity": 5,
            "unit": "bundle",
            "price": 15000,
            "original_price": 30000,
            "discount_percentage": 50,
            "seller_name": "F.R.E.S.H Kitchen Depok",
            "location_name": "Margonda, Depok",
            "latitude": -6.4025,
            "longitude": 106.7942,
            "expiration_date": _today_plus(1),
            "status": "Available",
            "notes": "Lettuce perlu dipakai segera untuk salad.",
            "title": "Lettuce Bundle",
            "description": "Lettuce perlu dipakai segera untuk salad.",
            "type": "sale",
            "location": "Margonda, Depok",
        },
    ]
    _add_all_if_empty(db, MarketplaceListing, rows, meaningful_field="food_name")


def seed_donations(db: Session) -> None:
    rows = [
        {
            "food_name": "Rice Box Donation",
            "category": "Meal",
            "quantity": 20,
            "unit": "portion",
            "donor_name": "Kantin Kampus",
            "pickup_location": "Karet Sudirman, Jakarta Pusat",
            "latitude": -6.2146,
            "longitude": 106.8217,
            "expiration_date": _today_plus(0),
            "status": "Available",
            "notes": "Sisa acara seminar, masih tersegel.",
        },
        {
            "food_name": "Fresh Milk Donation",
            "category": "Dairy",
            "quantity": 12,
            "unit": "liter",
            "donor_name": "F.R.E.S.H Bakery Bandung",
            "pickup_location": "Dago, Bandung",
            "latitude": -6.8839,
            "longitude": 107.6139,
            "expiration_date": _today_plus(2),
            "status": "Requested",
            "notes": "Susu segar untuk pickup pagi.",
        },
        {
            "food_name": "Bread Donation",
            "category": "Bakery",
            "quantity": 25,
            "unit": "pcs",
            "donor_name": "Bakery Corner",
            "pickup_location": "Tebet Barat, Jakarta Selatan",
            "latitude": -6.2264,
            "longitude": 106.8589,
            "expiration_date": _today_plus(1),
            "status": "Available",
            "notes": "Roti aneka rasa masih layak konsumsi.",
        },
        {
            "food_name": "Vegetable Donation",
            "category": "Vegetable",
            "quantity": 8,
            "unit": "kg",
            "donor_name": "Pasar Segar",
            "pickup_location": "Blok M, Jakarta Selatan",
            "latitude": -6.2441,
            "longitude": 106.7988,
            "expiration_date": _today_plus(2),
            "status": "Available",
            "notes": "Sayuran campur untuk dimasak hari ini atau besok.",
        },
    ]
    _add_all_if_empty(db, DonationItem, rows, meaningful_field="food_name")


def seed_business_inventory(db: Session) -> None:
    rows = [
        {
            "item_name": "Chicken Breast",
            "category": "Protein",
            "batch_code": "A102",
            "quantity": 25,
            "unit": "kg",
            "supplier": "PT Ayam Segar Nusantara",
            "purchase_date": _today_plus(-2),
            "expiration_date": _today_plus(1),
            "branch": "F.R.E.S.H Cafe Jakarta",
            "storage_area": "Cold Storage A",
            "cost_per_unit": 45000,
            "selling_price": 75000,
            "estimated_loss": 1125000,
            "risk_label": "High Risk",
            "risk_score": 0.88,
            "suggested_action": "Prioritize for today's menu. Apply discount or move to surplus.",
            "status": "High Risk",
        },
        {
            "item_name": "Fresh Milk",
            "category": "Dairy",
            "batch_code": "D221",
            "quantity": 40,
            "unit": "liter",
            "supplier": "Koperasi Susu Bandung",
            "purchase_date": _today_plus(-4),
            "expiration_date": _today_plus(2),
            "branch": "F.R.E.S.H Bakery Bandung",
            "storage_area": "Refrigerator B",
            "cost_per_unit": 18000,
            "selling_price": 28000,
            "estimated_loss": 720000,
            "risk_label": "Warning",
            "risk_score": 0.65,
            "suggested_action": "Use for baking or beverages. Consider discount promotion.",
            "status": "Warning",
        },
        {
            "item_name": "Lettuce",
            "category": "Vegetable",
            "batch_code": "V440",
            "quantity": 15,
            "unit": "kg",
            "supplier": "Kebun Organik Lembang",
            "purchase_date": _today_plus(-3),
            "expiration_date": _today_plus(1),
            "branch": "F.R.E.S.H Kitchen Depok",
            "storage_area": "Vegetable Rack",
            "cost_per_unit": 12000,
            "selling_price": 22000,
            "estimated_loss": 180000,
            "risk_label": "High Risk",
            "risk_score": 0.9,
            "suggested_action": "Use immediately for salads. Donate remainder to food bank.",
            "status": "High Risk",
        },
        {
            "item_name": "Bread Loaf",
            "category": "Bakery",
            "batch_code": "B311",
            "quantity": 30,
            "unit": "loaf",
            "supplier": "Bakery Artisan Jakarta",
            "purchase_date": _today_plus(-2),
            "expiration_date": _today_plus(2),
            "branch": "F.R.E.S.H Cafe Jakarta",
            "storage_area": "Dry Storage",
            "cost_per_unit": 25000,
            "selling_price": 40000,
            "estimated_loss": 750000,
            "risk_label": "Warning",
            "risk_score": 0.55,
            "suggested_action": "Apply 30% discount. List surplus in marketplace.",
            "status": "Warning",
        },
        {
            "item_name": "Yogurt",
            "category": "Dairy",
            "batch_code": "Y017",
            "quantity": 60,
            "unit": "cup",
            "supplier": "Dairy Fresh Indonesia",
            "purchase_date": _today_plus(-5),
            "expiration_date": _today_plus(4),
            "branch": "F.R.E.S.H Bakery Bandung",
            "storage_area": "Refrigerator A",
            "cost_per_unit": 15000,
            "selling_price": 25000,
            "estimated_loss": 0,
            "risk_label": "Safe",
            "risk_score": 0.25,
            "suggested_action": "Stock is safe. Monitor daily.",
            "status": "Safe",
        },
        {
            "item_name": "Tomato Box",
            "category": "Vegetable",
            "batch_code": "T990",
            "quantity": 20,
            "unit": "kg",
            "supplier": "Petani Lokal Cianjur",
            "purchase_date": _today_plus(-3),
            "expiration_date": _today_plus(3),
            "branch": "F.R.E.S.H Kitchen Depok",
            "storage_area": "Vegetable Rack",
            "cost_per_unit": 8000,
            "selling_price": 15000,
            "estimated_loss": 160000,
            "risk_label": "Warning",
            "risk_score": 0.5,
            "suggested_action": "Use for sauces and soups. Transfer excess to Jakarta branch.",
            "status": "Warning",
        },
        {
            "item_name": "Egg Tray",
            "category": "Protein",
            "batch_code": "E203",
            "quantity": 10,
            "unit": "tray",
            "supplier": "Peternakan Ayam Jaya",
            "purchase_date": _today_plus(-7),
            "expiration_date": _today_plus(7),
            "branch": "F.R.E.S.H Cafe Jakarta",
            "storage_area": "Refrigerator C",
            "cost_per_unit": 55000,
            "selling_price": 70000,
            "estimated_loss": 0,
            "risk_label": "Safe",
            "risk_score": 0.15,
            "suggested_action": "Stock is safe. Maintain current storage.",
            "status": "Safe",
        },
    ]
    _add_all_if_empty(db, BusinessInventory, rows, meaningful_field="item_name")


def seed_business_orders(db: Session) -> None:
    rows = [
        {
            "food_item": "Reservation surplus bread",
            "buyer": "Warung Makan Bu Siti",
            "quantity": 10,
            "unit": "loaf",
            "price": 280000,
            "pickup_time": "Today 14:00",
            "status": "Confirmed",
            "branch": "F.R.E.S.H Cafe Jakarta",
            "type": "sale",
        },
        {
            "food_item": "Donation pickup milk",
            "buyer": "Panti Asuhan Al-Ikhlas",
            "quantity": 10,
            "unit": "liter",
            "price": 0,
            "pickup_time": "Tomorrow 09:00",
            "status": "Pending",
            "branch": "F.R.E.S.H Bakery Bandung",
            "type": "donation",
        },
        {
            "food_item": "Marketplace lettuce order",
            "buyer": "Resto Salad Bar Depok",
            "quantity": 5,
            "unit": "kg",
            "price": 75000,
            "pickup_time": "Today 16:00",
            "status": "Completed",
            "branch": "F.R.E.S.H Kitchen Depok",
            "type": "sale",
        },
    ]
    _add_all_if_empty(db, BusinessOrder, rows, meaningful_field="food_item")


def seed_business_branches(db: Session) -> None:
    rows = [
        {
            "branch_name": "F.R.E.S.H Cafe Jakarta",
            "location": "Jl. Sudirman No. 45, Jakarta Selatan",
            "latitude": -6.2088,
            "longitude": 106.8456,
            "manager_name": "Budi Santoso",
            "contact": "+62 812 1111 2222",
            "total_inventory": 3,
            "high_risk_items": 2,
            "waste_prevented": 18,
            "marketplace_listings": 4,
        },
        {
            "branch_name": "F.R.E.S.H Bakery Bandung",
            "location": "Jl. Dago No. 12, Bandung",
            "latitude": -6.9175,
            "longitude": 107.6191,
            "manager_name": "Sari Dewi",
            "contact": "+62 813 3333 4444",
            "total_inventory": 2,
            "high_risk_items": 0,
            "waste_prevented": 12,
            "marketplace_listings": 2,
        },
        {
            "branch_name": "F.R.E.S.H Kitchen Depok",
            "location": "Jl. Margonda Raya No. 88, Depok",
            "latitude": -6.4025,
            "longitude": 106.7942,
            "manager_name": "Andi Pratama",
            "contact": "+62 814 5555 6666",
            "total_inventory": 2,
            "high_risk_items": 1,
            "waste_prevented": 8,
            "marketplace_listings": 1,
        },
    ]
    _add_all_if_empty(db, BusinessBranch, rows, meaningful_field="branch_name")


@app.get("/")
def root():
    return {"message": "F.R.E.S.H API is running", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "fresh-backend"}


@app.get("/model/metadata")
def get_metadata():
    return model_metadata()


@app.get("/scan-food/status")
def scan_food_status():
    return vision_model_status()


@app.get("/debug-model")
def debug_model():
    return debug_model_info()


@app.get("/debug-labels")
def debug_labels():
    return debug_labels_info()


@app.get("/debug-artifacts")
def debug_artifacts():
    return {
        "artifacts_dir": str(ARTIFACTS_DIR),
        "model_path": str(MODEL_PATH),
        "model_exists": MODEL_PATH.exists(),
        "labels_exists": LABELS_PATH.exists(),
        "metadata_exists": METADATA_PATH.exists(),
        "files": [p.name for p in ARTIFACTS_DIR.glob("*")] if ARTIFACTS_DIR.exists() else [],
    }


@app.post("/scan-food")
async def scan_food(image: UploadFile = File(...)):
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded image is empty")
    return predict_food_from_image(image_bytes, filename=image.filename)


@app.post("/predict-risk")
def predict_risk(payload: PredictInput):
    return predict_food_risk(**payload.model_dump())


@app.get("/foods")
def list_foods(
    user_id: str = Query("demo-user"),
    include_finished: bool = False,
    db: Session = Depends(get_db),
):
    query = db.query(FoodItem).filter(FoodItem.user_id == user_id)
    if not include_finished:
        query = query.filter(FoodItem.is_finished == False)
    items = query.order_by(FoodItem.created_at.desc()).all()
    return _json([_serialize_food(item) for item in items])


@app.post("/foods")
def create_food(payload: FoodCreate, db: Session = Depends(get_db)):
    food_name = payload.food_name or payload.name or "Food Item"
    expiration_date = _as_expiration_date(
        payload.expiration_date,
        payload.expiry_date,
        payload.days_to_expiry,
    )
    prediction = predict_food_risk(
        food_name=food_name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        expiration_date=expiration_date,
        days_to_expiry=payload.days_to_expiry,
        storage_condition=_storage(payload),
        shelf_life=payload.shelf_life,
        role=payload.role,
    )
    item = FoodItem(
        user_id=payload.user_id,
        role=payload.role,
        food_name=food_name,
        name=food_name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        purchase_date=payload.purchase_date,
        expiration_date=expiration_date,
        storage_condition=_storage(payload),
        shelf_life=payload.shelf_life or prediction["shelf_life"],
        notes=payload.notes,
        risk_label=prediction["risk_label"],
        risk_level=prediction["risk_label"],
        risk_score=prediction["risk_score"],
        recommendation=prediction["recommendation"],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _json(_serialize_food(item))


@app.get("/foods/{food_id}")
def get_food(food_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return _json(_serialize_food(item))


@app.put("/foods/{food_id}")
def update_food(food_id: int, payload: FoodUpdate, db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    data = payload.model_dump(exclude_unset=True)
    if "name" in data and "food_name" not in data:
        data["food_name"] = data.pop("name")
    if "expiry_date" in data and "expiration_date" not in data:
        data["expiration_date"] = data.pop("expiry_date")
    if "storage_type" in data and "storage_condition" not in data:
        data["storage_condition"] = data.pop("storage_type")
    if "days_to_expiry" in data and "expiration_date" not in data:
        data["expiration_date"] = _today_plus(int(data.pop("days_to_expiry")))

    for field, value in data.items():
        if hasattr(item, field) and value is not None:
            setattr(item, field, value)

    if item.food_name:
        item.name = item.food_name
    prediction = predict_food_risk(
        food_name=item.food_name or item.name or "Food Item",
        category=item.category or "Other",
        quantity=item.quantity or 1,
        unit=item.unit or "pcs",
        expiration_date=item.expiration_date,
        storage_condition=item.storage_condition,
        shelf_life=item.shelf_life,
        role=item.role or "personal",
    )
    item.risk_label = prediction["risk_label"]
    item.risk_level = prediction["risk_label"]
    item.risk_score = prediction["risk_score"]
    item.recommendation = prediction["recommendation"]

    db.commit()
    db.refresh(item)
    return _json(_serialize_food(item))


@app.delete("/foods/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    db.delete(item)
    db.commit()
    return {"message": "Food item deleted", "id": food_id}


@app.get("/dashboard")
def dashboard(user_id: str = Query("demo-user"), db: Session = Depends(get_db)):
    foods = db.query(FoodItem).filter(FoodItem.user_id == user_id, FoodItem.is_finished == False).all()
    high = sum(1 for item in foods if (item.risk_label or item.risk_level) == "High Risk")
    warning = sum(1 for item in foods if (item.risk_label or item.risk_level) == "Warning")
    safe = sum(1 for item in foods if (item.risk_label or item.risk_level) == "Safe")
    return _json(
        {
            "total_items": len(foods),
            "high_risk": high,
            "warning": warning,
            "safe": safe,
            "donation_candidates": [
                _serialize_food(item)
                for item in foods
                if (item.risk_label or item.risk_level) in {"High Risk", "Warning"}
            ][:5],
        }
    )


def _create_marketplace(payload: MarketplaceCreate, db: Session):
    expiration_date = payload.expiration_date or payload.expiry_date or _today_plus(2)
    food_name = payload.food_name or payload.title or "Surplus Food"
    location_name = payload.location_name or payload.location or "Jakarta"
    notes = payload.notes or payload.description or ""
    item = MarketplaceListing(
        food_id=payload.food_id,
        user_id=payload.user_id,
        role=payload.role,
        food_name=food_name,
        title=payload.title or food_name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        price=payload.price,
        original_price=payload.original_price,
        discount_percentage=_discount(payload.price, payload.original_price, payload.discount_percentage),
        seller_name=payload.seller_name,
        location_name=location_name,
        location=location_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        expiration_date=expiration_date,
        status=payload.status,
        notes=notes,
        description=payload.description or notes,
        type=payload.type,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _json(_serialize_marketplace(item))


@app.get("/marketplace")
@app.get("/marketplace/listings")
def list_marketplace(db: Session = Depends(get_db)):
    seed_marketplace(db)
    items = db.query(MarketplaceListing).order_by(MarketplaceListing.created_at.desc()).all()
    return _json([_serialize_marketplace(item) for item in items])


@app.post("/marketplace")
@app.post("/marketplace/listings")
def create_marketplace(payload: MarketplaceCreate, db: Session = Depends(get_db)):
    return _create_marketplace(payload, db)


@app.get("/marketplace/{listing_id}")
def get_marketplace_item(listing_id: int, db: Session = Depends(get_db)):
    item = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Marketplace item not found")
    return _json(_serialize_marketplace(item))


@app.put("/marketplace/{listing_id}")
def update_marketplace_item(
    listing_id: int,
    payload: MarketplaceUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Marketplace item not found")
    data = payload.model_dump(exclude_unset=True)
    if "expiry_date" in data and "expiration_date" not in data:
        data["expiration_date"] = data.pop("expiry_date")
    for field, value in data.items():
        if hasattr(item, field) and value is not None:
            setattr(item, field, value)
    item.discount_percentage = _discount(item.price or 0, item.original_price or 0, item.discount_percentage)
    if item.food_name:
        item.title = item.title or item.food_name
    db.commit()
    db.refresh(item)
    return _json(_serialize_marketplace(item))


@app.delete("/marketplace/{listing_id}")
def delete_marketplace_item(listing_id: int, db: Session = Depends(get_db)):
    item = db.query(MarketplaceListing).filter(MarketplaceListing.id == listing_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Marketplace item not found")
    db.delete(item)
    db.commit()
    return {"message": "Marketplace item deleted", "id": listing_id}


@app.get("/donations")
def list_donations(db: Session = Depends(get_db)):
    seed_donations(db)
    items = db.query(DonationItem).order_by(DonationItem.created_at.desc()).all()
    return _json([_serialize_donation(item) for item in items])


@app.post("/donations")
def create_donation(payload: DonationCreate, db: Session = Depends(get_db)):
    item = DonationItem(
        user_id=payload.user_id,
        role=payload.role,
        food_name=payload.food_name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        donor_name=payload.donor_name,
        pickup_location=payload.pickup_location,
        latitude=payload.latitude,
        longitude=payload.longitude,
        expiration_date=payload.expiration_date or payload.expiry_date or _today_plus(1),
        status=payload.status,
        notes=payload.notes,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _json(_serialize_donation(item))


@app.get("/donations/{donation_id}")
def get_donation(donation_id: int, db: Session = Depends(get_db)):
    item = db.query(DonationItem).filter(DonationItem.id == donation_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Donation item not found")
    return _json(_serialize_donation(item))


@app.put("/donations/{donation_id}")
def update_donation(donation_id: int, payload: DonationUpdate, db: Session = Depends(get_db)):
    item = db.query(DonationItem).filter(DonationItem.id == donation_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Donation item not found")
    data = payload.model_dump(exclude_unset=True)
    if "expiry_date" in data and "expiration_date" not in data:
        data["expiration_date"] = data.pop("expiry_date")
    for field, value in data.items():
        if hasattr(item, field) and value is not None:
            setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _json(_serialize_donation(item))


@app.delete("/donations/{donation_id}")
def delete_donation(donation_id: int, db: Session = Depends(get_db)):
    item = db.query(DonationItem).filter(DonationItem.id == donation_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Donation item not found")
    db.delete(item)
    db.commit()
    return {"message": "Donation item deleted", "id": donation_id}


@app.get("/analytics")
def analytics(db: Session = Depends(get_db)):
    foods = db.query(FoodItem).all()
    if not foods:
        seed_marketplace(db)
        seed_donations(db)
        return {
            "total_food_items": 20,
            "high_risk_items": 5,
            "warning_items": 8,
            "safe_items": 7,
            "estimated_waste_prevented_kg": 12.5,
            "estimated_money_saved": 175000,
            "total_donations": db.query(DonationItem).count(),
            "total_marketplace_listings": db.query(MarketplaceListing).count(),
            "risk_distribution": [
                {"name": "Safe", "value": 7},
                {"name": "Warning", "value": 8},
                {"name": "High Risk", "value": 5},
            ],
        }

    high = sum(1 for item in foods if (item.risk_label or item.risk_level) == "High Risk")
    warning = sum(1 for item in foods if (item.risk_label or item.risk_level) == "Warning")
    safe = sum(1 for item in foods if (item.risk_label or item.risk_level) == "Safe")
    return {
        "total_food_items": len(foods),
        "high_risk_items": high,
        "warning_items": warning,
        "safe_items": safe,
        "estimated_waste_prevented_kg": round((high * 1.5) + (warning * 0.8), 2),
        "estimated_money_saved": int((high * 25000) + (warning * 12500)),
        "total_donations": db.query(DonationItem).count(),
        "total_marketplace_listings": db.query(MarketplaceListing).count(),
        "risk_distribution": [
            {"name": "Safe", "value": safe},
            {"name": "Warning", "value": warning},
            {"name": "High Risk", "value": high},
        ],
    }


@app.get("/recommendations")
def recommendations(db: Session = Depends(get_db)):
    foods = db.query(FoodItem).filter(FoodItem.is_finished == False).all()
    if not foods:
        return [
            {
                "id": "r1",
                "food_name": "Tomato",
                "urgency": "medium",
                "action": "cook_recipe",
                "recipe": "Homemade Tomato Sauce",
                "recipe_description": "Cook tomatoes with garlic, onion, salt, and pepper.",
                "tips": "Freeze sauce in small portions if not used today.",
                "expires_in": "2 days",
            }
        ]
    return _json(
        [
            {
                "id": item.id,
                "food_name": item.food_name or item.name,
                "urgency": "high" if (item.risk_label or item.risk_level) == "High Risk" else "medium",
                "action": "donate" if (item.risk_label or item.risk_level) == "High Risk" else "cook_recipe",
                "recipe": "Quick meal idea",
                "recipe_description": item.recommendation,
                "tips": item.recommendation,
                "expires_in": str(item.expiration_date or ""),
            }
            for item in foods[:10]
        ]
    )


@app.get("/business/inventory")
def get_business_inventory(db: Session = Depends(get_db)):
    seed_business_inventory(db)
    items = db.query(BusinessInventory).order_by(BusinessInventory.created_at.desc()).all()
    return _json([_serialize_business_inventory(item) for item in items])


@app.post("/business/inventory")
def create_business_inventory(payload: BusinessInventoryCreate, db: Session = Depends(get_db)):
    expiration_date = payload.expiration_date or payload.expiry_date or _today_plus(5)
    risk = predict_food_risk(
        food_name=payload.item_name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        expiration_date=expiration_date,
        storage_condition=payload.storage_area or "Business Storage",
        role="business",
    )
    estimated_loss = (
        payload.estimated_loss
        if payload.estimated_loss is not None
        else max(0, payload.quantity * payload.cost_per_unit)
        if risk["risk_label"] in {"High Risk", "Warning"}
        else 0
    )
    item = BusinessInventory(
        business_id=payload.business_id,
        item_name=payload.item_name,
        category=payload.category,
        batch_code=payload.batch_code,
        quantity=payload.quantity,
        unit=payload.unit,
        supplier=payload.supplier,
        purchase_date=payload.purchase_date,
        expiration_date=expiration_date,
        branch=payload.branch,
        storage_area=payload.storage_area,
        cost_per_unit=payload.cost_per_unit,
        selling_price=payload.selling_price,
        estimated_loss=estimated_loss,
        risk_label=payload.risk_label or risk["risk_label"],
        risk_score=payload.risk_score if payload.risk_score is not None else risk["risk_score"],
        suggested_action=payload.suggested_action or risk["suggested_action"],
        status=payload.status or risk["risk_label"],
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _json(_serialize_business_inventory(item))


@app.put("/business/inventory/{inventory_id}")
def update_business_inventory(
    inventory_id: int,
    payload: BusinessInventoryUpdate,
    db: Session = Depends(get_db),
):
    item = db.query(BusinessInventory).filter(BusinessInventory.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Business inventory item not found")
    data = payload.model_dump(exclude_unset=True)
    if "expiry_date" in data and "expiration_date" not in data:
        data["expiration_date"] = data.pop("expiry_date")
    for field, value in data.items():
        if hasattr(item, field) and value is not None:
            setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _json(_serialize_business_inventory(item))


@app.delete("/business/inventory/{inventory_id}")
def delete_business_inventory(inventory_id: int, db: Session = Depends(get_db)):
    item = db.query(BusinessInventory).filter(BusinessInventory.id == inventory_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Business inventory item not found")
    db.delete(item)
    db.commit()
    return {"message": "Business inventory item deleted", "id": inventory_id}


@app.get("/business/orders")
def get_business_orders(db: Session = Depends(get_db)):
    seed_business_orders(db)
    orders = db.query(BusinessOrder).order_by(BusinessOrder.created_at.desc()).all()
    return _json(orders)


@app.patch("/business/orders/{order_id}")
def update_business_order(order_id: int, payload: BusinessOrderUpdate, db: Session = Depends(get_db)):
    seed_business_orders(db)
    order = db.query(BusinessOrder).filter(BusinessOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Business order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return _json(order)


@app.get("/business/branches")
def get_business_branches(db: Session = Depends(get_db)):
    seed_business_branches(db)
    branches = db.query(BusinessBranch).order_by(BusinessBranch.created_at.desc()).all()
    return _json([_serialize_branch(branch) for branch in branches])


@app.post("/business/branches")
def create_business_branch(payload: BusinessBranchCreate, db: Session = Depends(get_db)):
    branch = BusinessBranch(**payload.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return _json(_serialize_branch(branch))


@app.get("/business/analytics")
def business_analytics(db: Session = Depends(get_db)):
    seed_business_inventory(db)
    seed_business_branches(db)
    inventory = db.query(BusinessInventory).all()
    branches = db.query(BusinessBranch).all()
    high_value = sum((item.estimated_loss or 0) for item in inventory if item.risk_label == "High Risk")
    total_prevented = max(2500000, int(sum(item.estimated_loss or 0 for item in inventory)))
    return {
        "estimated_loss_prevented": total_prevented,
        "high_risk_stock_value": int(high_value or 850000),
        "surplus_sales": 1200000,
        "donation_volume_kg": 42,
        "monthly_waste_reduction": 28,
        "branch_comparison": [
            {
                "branch": branch.branch_name,
                "waste_prevented": branch.waste_prevented,
                "high_risk_items": branch.high_risk_items,
                "marketplace_listings": branch.marketplace_listings,
            }
            for branch in branches
        ],
        "total_stock_items": len(inventory),
        "high_risk_items": sum(1 for item in inventory if item.risk_label == "High Risk"),
        "surplus_listings": db.query(MarketplaceListing).count(),
        "total_branches": len(branches),
    }


@app.get("/business/report")
def business_report():
    return {
        "food_saved_kg": 85,
        "estimated_loss_prevented": 2500000,
        "surplus_sold": 32,
        "donations_completed": 12,
        "estimated_co2e_reduced": 212.5,
        "monthly_summary": [
            {"month": "Jan", "food_saved_kg": 42, "loss_prevented": 1200000, "co2e_reduced": 105},
            {"month": "Feb", "food_saved_kg": 55, "loss_prevented": 1800000, "co2e_reduced": 137.5},
            {"month": "Mar", "food_saved_kg": 68, "loss_prevented": 2200000, "co2e_reduced": 170},
            {"month": "Apr", "food_saved_kg": 85, "loss_prevented": 2500000, "co2e_reduced": 212.5},
        ],
    }


SUBSCRIPTION_STATE = {
    "plan_id": "free",
    "plan_name": "Free Starter",
    "role": "personal",
    "status": "active",
    "billing_cycle": "monthly",
    "started_at": "2026-01-01",
    "expires_at": None,
    "usage": {
        "inventory_items": 18,
        "ai_scans_this_month": 3,
        "marketplace_listings": 1,
        "donation_listings": 2,
        "branches": 0,
    },
}


PLAN_NAMES = {
    "free": "Free Starter",
    "personal_plus": "Personal Plus",
    "business_pro": "Business Pro",
}


@app.get("/subscription")
def get_subscription():
    return SUBSCRIPTION_STATE


@app.post("/subscription/upgrade")
def upgrade_subscription(payload: dict):
    plan_id = payload.get("plan_id", "free")
    role = payload.get("role") or ("business" if plan_id == "business_pro" else "personal")
    SUBSCRIPTION_STATE.update(
        {
            "plan_id": plan_id,
            "plan_name": PLAN_NAMES.get(plan_id, "Free Starter"),
            "role": role,
            "status": "active",
            "billing_cycle": payload.get("billing_cycle", "monthly"),
        }
    )
    return SUBSCRIPTION_STATE


@app.post("/subscription/cancel")
def cancel_subscription():
    SUBSCRIPTION_STATE.update({"plan_id": "free", "plan_name": "Free Starter", "role": "personal"})
    return SUBSCRIPTION_STATE


@app.get("/subscription/usage")
def get_subscription_usage():
    return SUBSCRIPTION_STATE["usage"]


@app.post("/subscription/usage/increment")
def increment_subscription_usage(payload: dict):
    usage_type = payload.get("type")
    if usage_type:
      SUBSCRIPTION_STATE["usage"][usage_type] = SUBSCRIPTION_STATE["usage"].get(usage_type, 0) + 1
    return SUBSCRIPTION_STATE


@app.post("/payments/create-transaction")
def create_payment_transaction(payload: dict):
    return {
        "transaction_id": f"dummy_tx_{payload.get('plan_id', 'free')}",
        "plan_id": payload.get("plan_id"),
        "status": "pending",
        "checkout_url": None,
        "sandbox": True,
        "message": "Replace this dummy response with Midtrans/Xendit transaction API later.",
    }


@app.post("/payments/webhook")
def payments_webhook(payload: dict):
    return {"ok": True, "received": payload, "sandbox": True}
