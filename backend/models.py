from pydantic import BaseModel
from typing import Optional, List

# --- Request Bodies ---

# For Endpoint 3: Add a New Movie
class MovieCreate(BaseModel):
    title: str
    genres: str

# for Endpoint 4: Get Recommendations
class RatingInput(BaseModel):
    movieId: int
    rating: float

# for Endpoint 4: Get Recommendations
class RecommendationRequest(BaseModel):
    ratings: List[RatingInput]

# --- Item Models ---
class Movie(BaseModel):
    movieId: int
    title: str
    genres: Optional[str] = ""

class Rating(BaseModel):
    userId: int
    movieId: int
    rating: float
    timestamp: int

class RecommendedMovie(BaseModel):
    movieId: int
    title: str
    genres: Optional[str] = ""
    predictedRating: float

# --- Response Wrappers ---

# for Endpoint 1: Search Movies
class MovieSearchResponse(BaseModel):
    status: str = "success"
    movies: List[Movie]

# for Endpoint 2: Get Ratings for a Movie
class MovieRatingsResponse(BaseModel):
    status: str = "success"
    ratings: List[Rating]

# for Endpoint 3: Add a New Movie
class MovieAddResponse(BaseModel):
    status: str = "success"
    movieId: int

# for Endpoint 4: Get Recommendations
class RecommendationResponse(BaseModel):
    status: str = "success"
    recommendations: List[RecommendedMovie]