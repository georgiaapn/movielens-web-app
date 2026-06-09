import sqlite3
from pathlib import Path

# This is a relative path that points to the "movielens.db" file located in the same directory as this script. 
DB_PATH = Path(__file__).resolve().parent / "movielens.db"

def get_db_connection():
    """
    Creates and returns a connection to the database.
    """
    conn = sqlite3.connect(DB_PATH)

    # This allows us to access columns by their name (e.g., row["title"])
    # By default, sqlite3 returns rows as tuples, but setting row_factory to sqlite3.Row allows us to access columns 
    # by name, which can make our code more readable and easier to maintain.
    conn.row_factory = sqlite3.Row 
    
    return conn
