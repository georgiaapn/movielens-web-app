import sqlite3

DB_PATH = "movielens.db"

def get_db_connection():
    """
    Δημιουργεί και επιστρέφει μια σύνδεση με τη βάση δεδομένων.
    """
    conn = sqlite3.connect(DB_PATH)
    # Αυτό μας επιτρέπει να έχουμε πρόσβαση στις στήλες με το όνομά τους (π.χ. row["title"])
    conn.row_factory = sqlite3.Row 
    return conn