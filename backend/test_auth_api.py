#!/usr/bin/env python3
"""
Test script for authentication API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_login():
    """Test login endpoint"""
    print("Testing Login API...")
    
    login_data = {
        "email": "john@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")
            print(f"Token: {data.get('access_token', 'N/A')[:50]}...")
            print(f"Token Type: {data.get('token_type', 'N/A')}")
            print(f"Expires In: {data.get('expires_in', 'N/A')} seconds")
            return data.get('access_token')
        else:
            print(f"❌ Login failed!")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Raw Response: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error - Is the server running?")
        return None
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return None

def test_get_user(token):
    """Test get current user endpoint"""
    if not token:
        print("❌ No token provided")
        return
    
    print("\nTesting Get User API...")
    
    try:
        response = requests.get(
            f"{BASE_URL}/auth/me",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Get user successful!")
            print(f"User ID: {data.get('id', 'N/A')}")
            print(f"Name: {data.get('name', 'N/A')}")
            print(f"Email: {data.get('email', 'N/A')}")
            print(f"Role: {data.get('role', 'N/A')}")
            print(f"Provider: {data.get('provider', 'N/A')}")
        else:
            print(f"❌ Get user failed!")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Raw Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

def test_register():
    """Test register endpoint"""
    print("\nTesting Register API...")
    
    register_data = {
        "name": "Test User",
        "email": "testuser@example.com",
        "password": "testpass123",
        "role": "personal"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=register_data,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Register successful!")
            print(f"User ID: {data.get('id', 'N/A')}")
            print(f"Name: {data.get('name', 'N/A')}")
            print(f"Email: {data.get('email', 'N/A')}")
        else:
            print(f"❌ Register failed!")
            try:
                error_data = response.json()
                print(f"Error: {error_data}")
            except:
                print(f"Raw Response: {response.text}")
                
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

def test_server_health():
    """Test if server is running"""
    print("Testing Server Health...")
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=5)
        if response.status_code == 200:
            print("✅ Server is running!")
            return True
        else:
            print(f"❌ Server returned status: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running or not accessible")
        return False
    except Exception as e:
        print(f"❌ Server health check failed: {e}")
        return False

def main():
    print("=== F.R.E.S.H. Authentication API Test ===\n")
    
    # Test server health first
    if not test_server_health():
        print("\n❌ Please start the server first:")
        print("   cd backend")
        print("   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
        return
    
    # Test login
    token = test_login()
    
    # Test get user if login successful
    if token:
        test_get_user(token)
    
    # Test register (with new email)
    test_register()
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main()
