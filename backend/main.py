from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .database import get_db_connection
from .recommender import get_recommendations
from .models import (
    MovieAddResponse,
    MovieCreate, 
    RecommendationRequest, 
    MovieSearchResponse, 
    MovieRatingsResponse, 
    RecommendationResponse
)

app = FastAPI(title="MovieLens API")

# CORS Configuration to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500", # frontend server address
        "http://localhost:5500",
    ],
    # browser won't allow credentials (cookies, auth headers, sessionIDs) to be sent in cross-origin requests by default,
    # and since our API doesn't require them, we can safely set this to False.
    allow_credentials=False, 
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# --- API Endpoints ---

# Endpoint 1: Search Movies
# Users can access this endpoint by sending an HTTP GET request to this path
@app.get("/movielens/api/movies", response_model=MovieSearchResponse) # like a servlet
def search_movies(search: str = ""): # query parameter search, default value is an empty string
    conn = get_db_connection() # Connection
    cursor = conn.cursor() # create a cursor object to execute SQL queries against the database (Statement/Prepared Statement)

    try:
        query = "SELECT movieId, title, genres FROM movies WHERE title LIKE ?"
        cursor.execute(query, ('%' + search + '%',)) 
        # like means we want to find any title that contains the search string anywhere within it. 
        movies = cursor.fetchall() # Result set. movies will be a list of rows
        
        return {"status": "success", "movies": [dict(m) for m in movies]} 
        # Each movie will be represented as a dictionary with keys "movieId", "title", and "genres".
        
    except Exception as e:
        # 500 Internal Server Error
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "fail", 
                "message": f"Failed to search movies due to a server error: {str(e)}"
            }
        )
    finally: # The finally block is executed no matter what happens in the try block, whether an exception is raised or not.
        # Ensures that the database connection is closed regardless of whether an error occurred or not
        # preventing potential resource leaks
        conn.close()

# Endpoint 2: Get Ratings for a Movie
@app.get("/movielens/api/ratings/{movieId}", response_model=MovieRatingsResponse)
def get_movie_ratings(movieId: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if the movie exists first. If it doesn't, we return a 404 Not Found error.
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
        # if this didn't exist, our previously thrown 404 error would be caught by the generic 
        #Exception handler below, and we would end up returning a 500 Internal Server Error 
        raise # We re-raise the HTTPException to continue as a 404 error
    except Exception as e:
        # Database/Server (500 Internal Server Error)
        raise HTTPException(
            status_code=500, 
            detail={
                "status": "fail", 
                "message": f"Failed to fetch ratings due to a server error: {str(e)}"
            }
        )
    finally:
        # Ensures that the database connection is closed regardless of whether an error occurred or not
        conn.close()

# Endpoint 3: Add a New Movie
@app.post("/movielens/api/movies" , response_model=MovieAddResponse)
def add_movie(movie: MovieCreate):

    # 1. If title is empty, return 400 Bad Request
    if not movie.title or len(movie.title.strip()) == 0:
        raise HTTPException(
            status_code=400, 
            detail={"status": "fail", "message": "Movie title cannot be empty."}
        )
        
    # 2. If no genres are selected, return 400 Bad Request
    if not movie.genres or len(movie.genres.strip()) == 0:
        raise HTTPException(
            status_code=400, 
            detail={"status": "fail", "message": "You must select at least one genre."}
        )
    
    conn = get_db_connection()
    cursor = conn.cursor()

    # Find the next available ID (larger than the maximum existing movieId, to ensure AUTO_INCREMENT)
    cursor.execute("SELECT MAX(movieId) FROM movies")
    max_id = cursor.fetchone()[0] or 0
    new_id = max_id + 1 # ensure unique movieId for our new movie

    try:
        query = "INSERT INTO movies (movieId, title, genres) VALUES (?, ?, ?)"
        cursor.execute(query, (new_id, movie.title, movie.genres))
        conn.commit() # commit the transaction to save changes to the database
        return {"status": "success", "movieId": new_id}
    except Exception:
        conn.rollback() # If an error occurs, we undo any changes that were made to the database during this transaction
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
        # We convert the list of RatingInput objects into a list of dictionaries with keys "movieId" and "rating"
        # the result is something like [{"movieId": 1, "rating": 4.5}, {"movieId": 2, "rating": 3.0}, ...]
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
