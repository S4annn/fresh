import os
import tempfile
import uuid
from pathlib import Path

TEST_DB = Path(tempfile.gettempdir()) / f"fresh_smoke_{uuid.uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["SECRET_KEY"] = "test-secret"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def fresh_email(prefix="user"):
    return f"{prefix}-{uuid.uuid4().hex[:8]}@example.com"


def register_user(role="personal"):
    email = fresh_email(role)
    payload = {
        "name": f"{role.title()} User",
        "email": email,
        "password": "secret123",
        "role": role,
    }
    if role == "business":
        payload["business_name"] = "Smoke Test Cafe"

    register_response = client.post("/auth/register", json=payload)
    assert register_response.status_code == 200, register_response.text
    login_response = client.post("/auth/login", json={"email": email, "password": "secret123"})
    assert login_response.status_code == 200, login_response.text
    login_data = login_response.json()
    return login_data["user"], login_data["access_token"]


def headers_for(user, plan_id="free"):
    return {
        "Authorization": "Bearer test",
        "X-Fresh-User-Id": user["uid"],
        "X-Fresh-Role": user["role"],
        "X-Fresh-Plan-Id": plan_id,
        "X-Fresh-Demo": "false",
    }


def test_register_login_returns_user_and_token():
    user, token = register_user("personal")

    assert token
    assert user["uid"]
    assert user["role"] == "personal"

    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_response.status_code == 200, me_response.text
    assert me_response.json()["uid"] == user["uid"]


def test_users_endpoint_requires_admin_token():
    response = client.get("/users")
    assert response.status_code in {401, 403}


def test_food_inventory_is_scoped_to_current_user_header():
    user_a, _ = register_user("personal")
    user_b, _ = register_user("personal")

    create_response = client.post(
        "/foods",
        headers=headers_for(user_a),
        json={
            "food_name": "Smoke Banana",
            "category": "Fruit",
            "quantity": 2,
            "unit": "pcs",
            "days_to_expiry": 2,
        },
    )
    assert create_response.status_code == 200, create_response.text

    user_a_foods = client.get("/foods", headers=headers_for(user_a))
    user_b_foods = client.get("/foods", headers=headers_for(user_b))

    assert len(user_a_foods.json()) == 1
    assert user_a_foods.json()[0]["food_name"] == "Smoke Banana"
    assert user_b_foods.json() == []


def test_subscription_upgrade_and_cancel_returns_frontend_shape():
    user, _ = register_user("business")
    headers = headers_for(user)

    upgrade_response = client.post(
        "/subscription/upgrade",
        headers=headers,
        json={
            "user_id": user["uid"],
            "plan_id": "business_pro",
            "role": "business",
            "billing_cycle": "monthly",
        },
    )
    assert upgrade_response.status_code == 200, upgrade_response.text
    upgraded = upgrade_response.json()
    assert upgraded["plan_id"] == "business_pro"
    assert upgraded["role"] == "business"
    assert upgraded["limits"]["business_features"] is True
    assert "usage" in upgraded

    cancel_response = client.post("/subscription/cancel", headers=headers, json={"user_id": user["uid"]})
    assert cancel_response.status_code == 200, cancel_response.text
    cancelled = cancel_response.json()
    assert cancelled["plan_id"] == "free"
    assert cancelled["usage"]["inventory_items"] >= 0


def test_business_inventory_requires_upgraded_business_user():
    user, _ = register_user("business")
    headers = headers_for(user, plan_id="business_pro")

    upgrade_response = client.post(
        "/subscription/upgrade",
        headers=headers,
        json={"user_id": user["uid"], "plan_id": "business_pro", "role": "business"},
    )
    assert upgrade_response.status_code == 200, upgrade_response.text

    create_response = client.post(
        "/business/inventory",
        headers=headers,
        json={
            "item_name": "Smoke Chicken",
            "category": "Protein",
            "batch_code": "SMK-1",
            "quantity": 5,
            "unit": "kg",
            "branch": "Smoke Branch",
            "cost_per_unit": 10000,
            "selling_price": 18000,
            "days_to_expiry": 1,
        },
    )
    assert create_response.status_code == 200, create_response.text
    assert create_response.json()["business_id"] == user["uid"]

    list_response = client.get("/business/inventory", headers=headers)
    assert list_response.status_code == 200, list_response.text
    assert [item["item_name"] for item in list_response.json()] == ["Smoke Chicken"]
