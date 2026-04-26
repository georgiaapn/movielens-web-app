from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Η διαδρομή προς τη βάση
SQLALCHEMY_DATABASE_URL = "sqlite:///./movielens.db"

# Δημιουργία του engine (το connect_args χρειάζεται μόνο για την SQLite)
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Συνάρτηση Dependency για να ανοίγει/κλείνει η σύνδεση σε κάθε request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()