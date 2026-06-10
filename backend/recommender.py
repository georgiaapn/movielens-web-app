from .database import get_db_connection
import math

TOP_K = 20   # Number of most similar users
TOP_N = 10   # Number of recommendations to return


# e.g., common_ratings_u = [4.0, 5.0, 3.0], common_ratings_v = [5.0, 4.0, 2.0]
def pearson_correlation(common_ratings_u: list, common_ratings_v: list) -> float:
    """
    We compute the Pearson correlation coefficient only for the movies that have been rated by both users,
    i.e. between two lists of ratings corresponding to the same movies.

    num = pSum - (sum1 * sum2) / n
    den = sqrt((sum1Sq - sum1²/n) * (sum2Sq - sum2²/n))
    r   = num / den
    """

    # number of common ratings
    n = len(common_ratings_u)
    if n == 0:
        return 0.0

    sum1   = sum(common_ratings_u)
    sum2   = sum(common_ratings_v)
    sum1sq = sum(x ** 2 for x in common_ratings_u)
    sum2sq = sum(x ** 2 for x in common_ratings_v)
    psum   = sum(a * b for a, b in zip(common_ratings_u, common_ratings_v))
 
    num = psum - (sum1 * sum2) / n
    den = math.sqrt((sum1sq - sum1 ** 2 / n) * (sum2sq - sum2 ** 2 / n))
 
    if den == 0:
        return 0.0
 
    return num / den
 
 
def get_recommendations(user_ratings: list) -> list:
    """
    Takes the user's ratings (a list of dictionaries with keys "movieId" and "rating")
    and returns the TOP_N recommendations based on Pearson collaborative filtering.
    """
    # We convert the user's ratings list into a dict {movieId: rating} for easier access
    # e.g., user_ratings = [
    #     {"movieId": 1,  "rating": 4.5},
    #     {"movieId": 32, "rating": 5.0},
    #     {"movieId": 10, "rating": 3.0}
    # ]
    # becomes user_rated = {1: 4.5, 32: 5.0, 10: 3.0}
    user_rated = {r["movieId"]: r["rating"] for r in user_ratings}
    user_mean = sum(user_rated.values()) / len(user_rated) # mean rating of the user, used in the prediction formula
 
    conn = get_db_connection()
 
    
    # We create a list with the movieIds that the user has rated, e.g., [1, 32, 10]
    movie_ids = list(user_rated.keys()) 

    # we use placeholders to pass the movieIds dynamically to the query
    # e.g., SELECT * FROM ratings WHERE movieId IN (1, 32, 10) -> placeholders = "?, ?, ?"
    placeholders = ",".join("?" * len(movie_ids)) 
 
    # We find users who have rated at least one movie in common with our user
    neighbor_rows = conn.execute(
        f"SELECT DISTINCT userId FROM ratings WHERE movieId IN ({placeholders})",
        movie_ids
    ).fetchall() # the result is a list of dictionaries with the userIds of the neighbors, e.g., [{"userId": 5}, {"userId": 12}, ...])
    neighbor_ids = [row["userId"] for row in neighbor_rows] # we extract only the userIds into a list, e.g., [5, 12, ...]
 
    if not neighbor_ids: 
        conn.close()
        return []
 
    # Load all ratings for the neighbors in bulk
    n_placeholders = ",".join("?" * len(neighbor_ids))
    all_rows = conn.execute(
        f"SELECT userId, movieId, rating FROM ratings WHERE userId IN ({n_placeholders})",
        neighbor_ids
    ).fetchall()
 
    # Organize: {userId: {movieId: rating}} e.g., {5: {1: 4.0, 10: 2.0}, 12: {32: 5.0, 10: 3.0}, ...}
    neighbor_ratings: dict = {}
    for row in all_rows:
        uid = row["userId"]
        if uid not in neighbor_ratings:
            neighbor_ratings[uid] = {}
        neighbor_ratings[uid][row["movieId"]] = row["rating"]
 
    # Compute Pearson correlation for each neighbor
    similarities = []
    # we get the movies that our user has rated (user_rated) and
    # that also exist in the neighbor's ratings (v_ratings)
    for uid, v_ratings in neighbor_ratings.items():
        common_movies = [mid for mid in user_rated if mid in v_ratings]
        if len(common_movies) < 2: # If we have fewer than 2 common movies, we can't calculate the correlation, so we skip
            continue
        u_vals = [user_rated[m] for m in common_movies]
        v_vals = [v_ratings[m] for m in common_movies]
        sim = pearson_correlation(u_vals, v_vals)
        if sim > 0:
            similarities.append((uid, sim)) # list of tuples
 
    # TOP_K most similar users
    similarities.sort(key=lambda x: x[1], reverse=True) # sort by similarity score in descending order
    top_neighbors = similarities[:TOP_K]
 
    if not top_neighbors:
        conn.close()
        return []
 
    # Average ratings of each neighbor (will be used for prediction formula)
    neighbor_means = {}
    for uid, _ in top_neighbors:
        v_r = neighbor_ratings[uid]
        neighbor_means[uid] = sum(v_r.values()) / len(v_r)
 
    # Candidate movies: rated by neighbors but not by the user
    candidate_movies = set() # we use a set to avoid duplicates
    for uid, _ in top_neighbors:
        for mid in neighbor_ratings[uid]:
            if mid not in user_rated:
                candidate_movies.add(mid)
 
    if not candidate_movies:
        conn.close()
        return []
 
    # Prediction formula: r̂(u,i) = mean_u + Σ[sim(u,v)*(r(v,i)-mean_v)] / Σ|sim(u,v)|
    predictions = []
    for mid in candidate_movies:
        numerator = 0.0
        denominator = 0.0
        for uid, sim in top_neighbors:
            if mid in neighbor_ratings[uid]:
                numerator += sim * (neighbor_ratings[uid][mid] - neighbor_means[uid])
                denominator += abs(sim)
        if denominator == 0:
            continue
        predicted = user_mean + numerator / denominator
        predictions.append((mid, predicted))
 
    # TOP_N movies with the highest predicted ratings
    predictions.sort(key=lambda x: x[1], reverse=True)
    top_predictions = predictions[:TOP_N]
 
    if not top_predictions:
        conn.close()
        return []
 
    #  Retrieve titles and genres from the database
    top_ids = [p[0] for p in top_predictions] # top_predictions = list of (movieId, rawPredictedRating) tuples
    id_placeholders = ",".join("?" * len(top_ids))
    movie_rows = conn.execute(
        f"SELECT movieId, title, genres FROM movies WHERE movieId IN ({id_placeholders})",
        top_ids
    ).fetchall()
    conn.close()
 
    movie_info = {row["movieId"]: row for row in movie_rows}
 
    result = []
    for mid, raw_pred_rating in top_predictions:
        if mid in movie_info:
            m = movie_info[mid]
            pred_rating = max(0.5, min(5.0, raw_pred_rating))
            result.append({
                "movieId": m["movieId"],
                "title": m["title"],
                "genres": m["genres"],
                "predictedRating": round(pred_rating, 4),
            })
 
    return result
