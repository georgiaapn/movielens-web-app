from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection
from recommender import get_recommendations
from models import (
    MovieAddResponse,
    MovieCreate, 
    RecommendationRequest, 
    MovieSearchResponse, 
    MovieRatingsResponse, 
    RecommendationResponse
)

app = FastAPI(title="MovieLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

# Endpoint 1: Search Movies
@app.get("/movielens/api/movies", response_model=MovieSearchResponse)
def search_movies(search: str = ""):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT movieId, title, genres FROM movies WHERE title LIKE ?"
    cursor.execute(query, ('%' + search + '%',))
    movies = cursor.fetchall()
    conn.close()
    return {"status": "success", "movies": [dict(m) for m in movies]}

# Endpoint 2: Get Ratings for a Movie
@app.get("/movielens/api/ratings/{movieId}", response_model=MovieRatingsResponse)
def get_movie_ratings(movieId: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ελέγχουμε αν υπάρχει η ταινία
    cursor.execute("SELECT movieId FROM movies WHERE movieId = ?", (movieId,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail=f"Movie {movieId} not found.")
    
    query = "SELECT userId, movieId, rating, timestamp FROM ratings WHERE movieId = ?"
    cursor.execute(query, (movieId,))
    ratings = cursor.fetchall()
    conn.close()
    return {"status": "success", "ratings": [dict(r) for r in ratings]}

# Endpoint 3: Add a New Movie
@app.post("/movielens/api/movies" , response_model=MovieAddResponse)
def add_movie(movie: MovieCreate):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Βρίσκουμε πρώτα το επόμενο ασφαλές ID (μεγαλύτερο από το μέγιστο υπάρχον movieId, ώστε να χουμε AUTO_INCREMENT)
    cursor.execute("SELECT MAX(movieId) FROM movies")
    max_id = cursor.fetchone()[0] or 0
    new_id = max_id + 1 # εξασφαλίζουμε unique movieId για το νέο μας movie

    try:
        query = "INSERT INTO movies (movieId, title, genres) VALUES (?, ?, ?)"
        cursor.execute(query, (new_id, movie.title, movie.genres))
        conn.commit()
        return {"status": "success", "movieId": new_id}
    except Exception:
        conn.rollback()
        raise HTTPException(status_code=500, detail="Failed to add movie")
    finally:
        conn.close()

# Endpoint 4: Get Recommendations
@app.post("/movielens/api/recommendations", response_model=RecommendationResponse)
def get_movie_recommendations(request: RecommendationRequest):
    try:
        user_ratings_list = [{"movieId": r.movieId, "rating": r.rating} for r in request.ratings]
        recommendations = get_recommendations(user_ratings_list)
        return {"status": "success", "recommendations": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))