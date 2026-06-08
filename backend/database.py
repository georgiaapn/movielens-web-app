import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "movielens.db"

def get_db_connection():
    """
    Δημιουργεί και επιστρέφει μια σύνδεση με τη βάση δεδομένων.
    """
    conn = sqlite3.connect(DB_PATH)
    # Αυτό μας επιτρέπει να έχουμε πρόσβαση στις στήλες με το όνομά τους (π.χ. row["title"])
    conn.row_factory = sqlite3.Row 
    return conn
