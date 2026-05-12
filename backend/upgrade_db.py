import sqlite3

def upgrade():
    try:
        conn = sqlite3.connect('fresh.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'pending_verification'")
        conn.commit()
        print("Column 'status' added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Column 'status' already exists.")
        else:
            print("Error:", e)
    finally:
        conn.close()

if __name__ == '__main__':
    upgrade()
