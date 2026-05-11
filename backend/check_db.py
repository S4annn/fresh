import sqlite3
import os

def check_database():
    db_path = 'fresh.db'
    
    if os.path.exists(db_path):
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print('Available tables:')
        for table in tables:
            print(f'  - {table[0]}')
        
        # Show schema for each table
        for table in tables:
            print(f'\nSchema for {table[0]}:')
            cursor.execute(f'PRAGMA table_info({table[0]})')
            columns = cursor.fetchall()
            for col in columns:
                print(f'  {col[1]} ({col[2]})')
        
        # Show sample data for each table
        for table in tables:
            print(f'\nSample data from {table[0]}:')
            cursor.execute(f'SELECT * FROM {table[0]} LIMIT 3')
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    print(f'  {row}')
            else:
                print('  (No data)')
        
        conn.close()
    else:
        print('Database file not found')

if __name__ == "__main__":
    check_database()
