from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date
import os

from .database import Base, engine, get_db
from .models import FoodItem, MarketplaceListing
from .schemas import (
    PredictInput, PredictOutput, FoodCreate, FoodUpdate, FoodOut,
    ListingCreate, ListingOut
)
from .ml import predict_food_risk, model_metadata
from .scanner import scan_food_image

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="F.R.E.S.H AI API",
    description="FastAPI backend untuk inventory, prediksi risiko food waste, rekomendasi, dan marketplace/donasi sederhana.",
    version="1.0.0"
)

origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "F.R.E.S.H API is running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/model/metadata")
def get_metadata():
    return model_metadata()

@app.post("/predict-risk", response_model=PredictOutput)
def predict_risk(payload: PredictInput):
    return predict_food_risk(
        food_name=payload.food_name,
        category=payload.category,
        quantity=payload.quantity,
        expiration_date=payload.expiration_date,
        storage_condition=payload.storage_condition,
        purchase_date=payload.purchase_date,
        shelf_life=payload.shelf_life
    )

@app.post("/foods", response_model=FoodOut)
def create_food(payload: FoodCreate, db: Session = Depends(get_db)):
    pred = predict_food_risk(
        food_name=payload.food_name,
        category=payload.category,
        quantity=payload.quantity,
        expiration_date=payload.expiration_date,
        storage_condition=payload.storage_condition,
        purchase_date=payload.purchase_date,
        shelf_life=payload.shelf_life
    )
    item = FoodItem(
        user_id=payload.user_id,
        name=payload.food_name,
        category=payload.category,
        quantity=payload.quantity,
        unit=payload.unit,
        purchase_date=payload.purchase_date,
        expiration_date=payload.expiration_date,
        storage_condition=payload.storage_condition,
        shelf_life=payload.shelf_life or 7,
        risk_level=pred["risk_level"],
        risk_score=pred["risk_score"],
        recommendation=pred["recommendation"]
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@app.get("/foods", response_model=list[FoodOut])
def list_foods(
    user_id: str = Query("demo-user"),
    include_finished: bool = False,
    db: Session = Depends(get_db)
):
    q = db.query(FoodItem).filter(FoodItem.user_id == user_id)
    if not include_finished:
        q = q.filter(FoodItem.is_finished == False)
    return q.order_by(FoodItem.expiration_date.asc()).all()

@app.put("/foods/{food_id}", response_model=FoodOut)
def update_food(food_id: int, payload: FoodUpdate, db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    pred = predict_food_risk(
        food_name=item.name,
        category=item.category,
        quantity=item.quantity,
        expiration_date=item.expiration_date,
        storage_condition=item.storage_condition,
        purchase_date=item.purchase_date,
        shelf_life=item.shelf_life
    )
    item.risk_level = pred["risk_level"]
    item.risk_score = pred["risk_score"]
    item.recommendation = pred["recommendation"]

    db.commit()
    db.refresh(item)
    return item

@app.delete("/foods/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    item = db.query(FoodItem).filter(FoodItem.id == food_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    db.delete(item)
    db.commit()
    return {"message": "deleted"}

@app.get("/dashboard")
def dashboard(user_id: str = Query("demo-user"), db: Session = Depends(get_db)):
    items = db.query(FoodItem).filter(FoodItem.user_id == user_id, FoodItem.is_finished == False).all()
    total = len(items)
    high = sum(1 for i in items if i.risk_level == "High Risk")
    warning = sum(1 for i in items if i.risk_level == "Warning")
    safe = sum(1 for i in items if i.risk_level == "Safe")
    donation_candidates = [
        {"id": i.id, "name": i.name, "risk_level": i.risk_level, "expiration_date": i.expiration_date}
        for i in items if i.risk_level in ["High Risk", "Warning"]
    ][:5]
    return {
        "total_items": total,
        "high_risk": high,
        "warning": warning,
        "safe": safe,
        "donation_candidates": donation_candidates
    }

@app.post("/marketplace/listings", response_model=ListingOut)
def create_listing(payload: ListingCreate, db: Session = Depends(get_db)):
    listing = MarketplaceListing(**payload.model_dump())
    db.add(listing)
    db.commit()
    db.refresh(listing)
    return listing

@app.get("/marketplace/listings", response_model=list[ListingOut])
def list_listings(db: Session = Depends(get_db)):
    return db.query(MarketplaceListing).filter(MarketplaceListing.status == "active").order_by(MarketplaceListing.created_at.desc()).all()


# ─── AI Food Scanner ──────────────────────────────────────────────────────────
@app.post("/scan-food")
async def scan_food(image: UploadFile = File(...)):
    """
    AI Food Scanner endpoint.
    Accepts an image file and returns food classification results.

    Current: Uses filename-based fallback classifier.
    Future: Replace with CNN/Transfer Learning model in scanner.py
    """
    try:
        image_bytes = await image.read()
        result = scan_food_image(
            filename=image.filename or "unknown.jpg",
            image_bytes=image_bytes
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")


# ─── Business Endpoints (Stubs — ready for full implementation) ───────────────
@app.get("/business/inventory")
def get_business_inventory(branch: str = Query(None), user_id: str = Query("demo-user")):
    """Business inventory endpoint — returns empty list (implement with DB model)."""
    return []


@app.get("/business/orders")
def get_business_orders(user_id: str = Query("demo-user")):
    """Business orders endpoint — returns empty list (implement with DB model)."""
    return []


@app.get("/business/branches")
def get_business_branches(user_id: str = Query("demo-user")):
    """Business branches endpoint — returns empty list (implement with DB model)."""
    return []


@app.get("/business/analytics")
def get_business_analytics(user_id: str = Query("demo-user")):
    """Business analytics endpoint — returns placeholder data."""
    return {
        "total_stock_items": 0,
        "high_risk_items": 0,
        "estimated_loss_prevented": 0,
        "surplus_listings": 0,
        "total_branches": 0,
        "monthly_waste_reduction": 0,
    }
