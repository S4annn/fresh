import json
import os
import sqlite3

def check_user_data():
    print("=== F.R.E.S.H. User Data Analysis ===\n")
    
    # 1. Check database tables for user-related data
    print("1. DATABASE TABLES (SQLite)")
    db_path = 'fresh.db'
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check unique user_ids in each table
        tables = ['food_items', 'marketplace_listings', 'donation_items', 'business_inventory', 'business_orders', 'business_branches']
        
        for table in tables:
            try:
                cursor.execute(f"SELECT DISTINCT user_id FROM {table} WHERE user_id IS NOT NULL")
                users = cursor.fetchall()
                if users:
                    print(f"\n{table}:")
                    for user in users:
                        user_id = user[0]
                        cursor.execute(f"SELECT COUNT(*) FROM {table} WHERE user_id = ?", (user_id,))
                        count = cursor.fetchone()[0]
                        print(f"  - {user_id} ({count} records)")
            except sqlite3.OperationalError:
                pass
        
        conn.close()
    else:
        print("Database file not found")
    
    # 2. Check if there's a way to access localStorage data
    print("\n2. USER DATA STORAGE")
    print("User data is stored in browser localStorage:")
    print("  - 'fresh_accounts': All registered accounts")
    print("  - 'fresh_session_user': Current logged-in user")
    print("  - 'fresh_user_subscription': User subscription data")
    
    # 3. Instructions to view localStorage data
    print("\n3. HOW TO VIEW USER DATA IN BROWSER")
    print("To see user sign up data, open browser DevTools:")
    print("  1. Open F.R.E.S.H. app (http://localhost:5177)")
    print("  2. Press F12 or right-click → Inspect")
    print("  3. Go to Application tab")
    print("  4. Under Storage → Local Storage → http://localhost:5177")
    print("  5. Look for these keys:")
    print("     - fresh_accounts (contains all registered users)")
    print("     - fresh_session_user (current logged-in user)")
    
    # 4. Create a simple web page to view localStorage data
    print("\n4. ALTERNATIVE: Create a data viewer")
    print("Creating a simple HTML page to view localStorage data...")
    
    html_content = '''
<!DOCTYPE html>
<html>
<head>
    <title>F.R.E.S.H. User Data Viewer</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .key { background: #f0f0f0; padding: 5px; border-radius: 3px; font-family: monospace; }
        .value { background: #f9f9f9; padding: 10px; border-radius: 3px; white-space: pre-wrap; font-family: monospace; font-size: 12px; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>F.R.E.S.H. User Data Viewer</h1>
    
    <div class="section">
        <h2>Instructions</h2>
        <p>1. Open the F.R.E.S.H. application in another tab</p>
        <p>2. Sign up some users or use existing accounts</p>
        <p>3. Come back to this page and click "Refresh Data" to see user information</p>
        <button onclick="refreshData()">Refresh Data</button>
        <button onclick="clearData()">Clear All Data</button>
    </div>
    
    <div class="section">
        <h2>Current Session User</h2>
        <div class="key">fresh_session_user</div>
        <div class="value" id="session-user">No data</div>
    </div>
    
    <div class="section">
        <h2>All Registered Accounts</h2>
        <div class="key">fresh_accounts</div>
        <div class="value" id="accounts">No data</div>
    </div>
    
    <div class="section">
        <h2>User Subscription Data</h2>
        <div class="key">fresh_user_subscription</div>
        <div class="value" id="subscription">No data</div>
    </div>
    
    <script>
        function refreshData() {
            // Session user
            const sessionUser = localStorage.getItem('fresh_session_user');
            document.getElementById('session-user').textContent = sessionUser || 'No data';
            
            // All accounts
            const accounts = localStorage.getItem('fresh_accounts');
            document.getElementById('accounts').textContent = accounts || 'No data';
            
            // Subscription data
            const subscription = localStorage.getItem('fresh_user_subscription');
            document.getElementById('subscription').textContent = subscription || 'No data';
        }
        
        function clearData() {
            if (confirm('This will clear all F.R.E.S.H. user data from localStorage. Continue?')) {
                localStorage.removeItem('fresh_session_user');
                localStorage.removeItem('fresh_accounts');
                localStorage.removeItem('fresh_user_subscription');
                localStorage.removeItem('fresh_demo_user');
                refreshData();
                alert('All data cleared!');
            }
        }
        
        // Auto-refresh on page load
        refreshData();
    </script>
</body>
</html>
    '''
    
    with open('user_data_viewer.html', 'w') as f:
        f.write(html_content)
    
    print("Created 'user_data_viewer.html' - open this file in browser to view user data")

if __name__ == "__main__":
    check_user_data()
