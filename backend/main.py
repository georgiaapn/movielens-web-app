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

    try:
        query = "SELECT movieId, title, genres FROM movies WHERE title LIKE ?"
        cursor.execute(query, ('%' + search + '%',))
        movies = cursor.fetchall()
        
        return {"status": "success", "movies": [dict(m) for m in movies]}
        
    except Exception as e:
        # Σφάλμα Database/Server (500 Internal Server Error)
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "fail", 
                "message": f"Failed to search movies due to a server error: {str(e)}"
            }
        )
    finally:
        # Εξασφαλίζουμε ότι η σύνδεση με τη βάση θα κλείσει πάντα
        conn.close()

# Endpoint 2: Get Ratings for a Movie
@app.get("/movielens/api/ratings/{movieId}", response_model=MovieRatingsResponse)
def get_movie_ratings(movieId: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Ελέγχουμε αν υπάρχει η ταινία
        cursor.execute("SELECT movieId FROM movies WHERE movieId = ?", (movieId,))
        if not cursor.fetchone():
            raise HTTPException(
                status_code=404, 
                detail={
                    "status": "fail", 
                    "message": f"Movie with ID {movieId} not found."
                }
            )
        
        query = "SELECT userId, movieId, rating, timestamp FROM ratings WHERE movieId = ?"
        cursor.execute(query, (movieId,))
        ratings = cursor.fetchall()
        return {"status": "success", "ratings": [dict(r) for r in ratings]}
    except HTTPException:
        # Αν πετάξαμε εμείς το 404 παραπάνω, το αφήνουμε να περάσει κανονικά
        raise
    except Exception as e:
        # 2. Σφάλμα Database/Server (500 Internal Server Error)
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "fail", 
                "message": f"Failed to fetch ratings due to a server error: {str(e)}"
            }
        )
    finally:
        # Το finally εγγυάται ότι η σύνδεση θα κλείσει Ο,ΤΙ κι αν συμβεί
        conn.close()

# Endpoint 3: Add a New Movie
@app.post("/movielens/api/movies" , response_model=MovieAddResponse)
def add_movie(movie: MovieCreate):

    # 1. Έλεγχος: Αν ο τίτλος είναι κενός, επιστρέφουμε 400 Bad Request
    if not movie.title or len(movie.title.strip()) == 0:
        raise HTTPException(
            status_code=400, 
            detail={"status": "fail", "message": "Movie title cannot be empty."}
        )
    
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
        raise HTTPException(
            status_code=500, 
            detail={"status": "fail", "message": "Failed to add movie due to a server error."}
        )
    finally:
        conn.close()

# Endpoint 4: Get Recommendations
@app.post("/movielens/api/recommendations", response_model=RecommendationResponse)
def get_movie_recommendations(request: RecommendationRequest):
    # 1. Έλεγχος (400 Bad Request): Αν η λίστα με τις βαθμολογίες είναι άδεια
    if not request.ratings or len(request.ratings) == 0:
        raise HTTPException(
            status_code=400,
            detail={
                "status": "fail", 
                "message": "You must provide at least one rating to get recommendations."
            }
        )
    try:
        user_ratings_list = [{"movieId": r.movieId, "rating": r.rating} for r in request.ratings]
        recommendations = get_recommendations(user_ratings_list)
        return {"status": "success", "recommendations": recommendations}
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "fail", 
                "message": f"Failed to generate recommendations: {str(e)}"
            }
        )