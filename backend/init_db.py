import sqlite3
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "movielens.db"
DATA_DIR = BASE_DIR / "data"

def init_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Δημιουργία πινάκων...")
    
    # Πίνακας movies
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            movieId INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            genres TEXT
        )
    ''')

    # Πίνακας ratings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ratings (
            userId INTEGER,
            movieId INTEGER,
            rating REAL,
            timestamp INTEGER,
            PRIMARY KEY (userId, movieId)
        )
    ''')

    # Πίνακας tags
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            userId INTEGER,
            movieId INTEGER,
            tag TEXT,
            timestamp INTEGER
        )
    ''')

    print("Φόρτωση δεδομένων από τα CSV...")

    # Φόρτωση movies.csv
    try:
        with open(DATA_DIR / "movies.csv", 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            movies_data = [(row['movieId'], row['title'], row['genres']) for row in reader]
            cursor.executemany('INSERT OR IGNORE INTO movies (movieId, title, genres) VALUES (?, ?, ?)', movies_data)
        print("Ο πίνακας 'movies' γέμισε!")
    except FileNotFoundError:
        print("Δεν βρέθηκε το movies.csv")

    # Φόρτωση ratings.csv
    try:
        with open(DATA_DIR / "ratings.csv", 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            ratings_data = [(row['userId'], row['movieId'], row['rating'], row['timestamp']) for row in reader]
            cursor.executemany('INSERT OR IGNORE INTO ratings (userId, movieId, rating, timestamp) VALUES (?, ?, ?, ?)', ratings_data)
        print("Ο πίνακας 'ratings' γέμισε!")
    except FileNotFoundError:
        print("Δεν βρέθηκε το ratings.csv")

    # Φόρτωση tags.csv
    try:
        with open(DATA_DIR / "tags.csv", 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            tags_data = [(row['userId'], row['movieId'], row['tag'], row['timestamp']) for row in reader]
            cursor.executemany('INSERT OR IGNORE INTO tags (userId, movieId, tag, timestamp) VALUES (?, ?, ?, ?)', tags_data)
        print("Ο πίνακας 'tags' γέμισε!")
    except FileNotFoundError:
        print("Δεν βρέθηκε το tags.csv")

    # Αποθήκευση αλλαγών και κλείσιμο
    conn.commit()
    conn.close()
    print("\nΗ βάση δεδομένων αρχικοποιήθηκε επιτυχώς με pure sqlite3!")

if __name__ == "__main__":
    init_database()
