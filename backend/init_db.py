import pandas as pd
from sqlalchemy import create_engine, Column, Integer, String, Float, Text
from sqlalchemy.ext.declarative import declarative_base
import os

# 1. Ορισμός της σύνδεσης με τη βάση (SQLite)
DB_URL = "sqlite:///movielens.db"
engine = create_engine(DB_URL)
Base = declarative_base()

# 2. Ορισμός των πινάκων βάσει των απαιτήσεων 
class Movie(Base):
    __tablename__ = 'movies'
    movieId = Column(Integer, primary_key=True)
    title = Column(String)
    genres = Column(String)

class Rating(Base):
    __tablename__ = 'ratings'
    userId = Column(Integer, primary_key=True)
    movieId = Column(Integer, primary_key=True)
    rating = Column(Float)
    timestamp = Column(Integer)

class Tag(Base):
    __tablename__ = 'tags'
    userId = Column(Integer, primary_key=True)
    movieId = Column(Integer, primary_key=True)
    tag = Column(String, primary_key=True)
    timestamp = Column(Integer)

def init_database():
    # Δημιουργία των πινάκων στη βάση
    Base.metadata.create_all(engine)
    
    # Διαδρομή προς τα αρχεία CSV (υποθέτοντας ότι είναι στον φάκελο data)
    data_path = "data"
    
    print("Ξεκινάει η φόρτωση των δεδομένων...")

    # 3. Populate τη βάση δεδομένων με τα δεδομένα από τα CSV αρχεία
    try:
        # Φόρτωση Movies
        movies_df = pd.read_csv(os.path.join(data_path, "movies.csv"))
        movies_df.to_sql('movies', engine, if_exists='replace', index=False)
        print("Ο πίνακας 'movies' δημιουργήθηκε!")

        # Φόρτωση Ratings
        ratings_df = pd.read_csv(os.path.join(data_path, "ratings.csv"))
        ratings_df.to_sql('ratings', engine, if_exists='replace', index=False)
        print("Ο πίνακας 'ratings' δημιουργήθηκε!")

        # Φόρτωση Tags
        tags_df = pd.read_csv(os.path.join(data_path, "tags.csv"))
        tags_df.to_sql('tags', engine, if_exists='replace', index=False)
        print("Ο πίνακας 'tags' δημιουργήθηκε!")

        print("\nΗ βάση δεδομένων αρχικοποιήθηκε επιτυχώς!")
        
    except FileNotFoundError:
        print("Σφάλμα: Δεν βρέθηκαν τα αρχεία CSV.")

if __name__ == "__main__":
    init_database()