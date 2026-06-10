import sqlite3
import csv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "movielens.db"
DATA_DIR = BASE_DIR / "data"

def init_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("Table creation ...")
    
    # Table movies
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS movies (
            movieId INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            genres TEXT
        )
    ''')

    # Table ratings
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ratings (
            userId INTEGER,
            movieId INTEGER,
            rating REAL,
            timestamp INTEGER,
            PRIMARY KEY (userId, movieId)
        )
    ''')

    # Table tags
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tags (
            userId INTEGER,
            movieId INTEGER,
            tag TEXT,
            timestamp INTEGER
        )
    ''')

    print("Loading data from CSV files...")

    # Load movies.csv
    try:
        with open(DATA_DIR / "movies.csv", 'r', encoding='utf-8') as f: # open file in read mode with UTF-8 encoding
            reader = csv.DictReader(f) 
            # if csv has header movieId,title,genres every row will be a dict 
            # like {"movieId": "1", "title": "Toy Story (1995)", "genres": "Adventure|Animation|Children|Comedy|Fantasy"}
            movies_data = [(row['movieId'], row['title'], row['genres']) for row in reader]
            # movies_data will be a list of tuples like 
            # [
            # ('1', 'Toy Story (1995)', 'Adventure|Animation|Children|Comedy|Fantasy'),
            # ('2', 'Jumanji (1995)', 'Adventure|Children|Fantasy'),
            # ...
            # ]
            cursor.executemany('INSERT OR IGNORE INTO movies (movieId, title, genres) VALUES (?, ?, ?)', movies_data)
            # execute the query for each tuple in movies_data
            # or ignore if movieId already exists (to avoid duplicates)
        print("The 'movies' table has been populated!")
    except FileNotFoundError:
        print("File not found: movies.csv")

    # Load ratings.csv
    try:
        with open(DATA_DIR / "ratings.csv", 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            ratings_data = [(row['userId'], row['movieId'], row['rating'], row['timestamp']) for row in reader]
            cursor.executemany('INSERT OR IGNORE INTO ratings (userId, movieId, rating, timestamp) VALUES (?, ?, ?, ?)', ratings_data)
        print("The 'ratings' table has been populated!")
    except FileNotFoundError:
        print("File not found: ratings.csv")

    # Load tags.csv
    try:
        with open(DATA_DIR / "tags.csv", 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            tags_data = [(row['userId'], row['movieId'], row['tag'], row['timestamp']) for row in reader]
            cursor.executemany('INSERT OR IGNORE INTO tags (userId, movieId, tag, timestamp) VALUES (?, ?, ?, ?)', tags_data)
        print("The 'tags' table has been populated!")
    except FileNotFoundError:
        print("File not found: tags.csv")

    # Save changes and close connection
    conn.commit()
    conn.close()
    print("\nThe database has been initialized successfully with pure sqlite3!")

if __name__ == "__main__":
    init_database()
