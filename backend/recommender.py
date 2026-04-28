from database import get_db_connection
import math

TOP_K = 20   # Αριθμός πιο παρόμοιων χρηστών
TOP_N = 10   # Αριθμός συστάσεων που επιστρέφουμε


def pearson_correlation(common_ratings_u: list, common_ratings_v: list) -> float:
    """
    Υπολογίζουμε τον συντελεστή συσχέτισης Pearson μόνο για τις ταινίες που έχουν βαθμολογηθεί και από τους δύο,
    δηλαδή μεταξύ δύο λιστών βαθμολογιών που αντιστοιχούν στις ίδιες ταινίες.

    num = pSum - (sum1 * sum2) / n
    den = sqrt((sum1Sq - sum1²/n) * (sum2Sq - sum2²/n))
    r   = num / den
    """

    # αριθμός κοινών ταινιών
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
    Δέχεται τα ratings του χρήστη (λίστα από {"movieId": int, "rating": float})
    και επιστρέφει τις TOP_N συστάσεις με βάση το Pearson collaborative filtering.
    """
    # Μετατρέπουμε την λίστα ratings του χρήστη σε dict {movieId: rating}
    # π.χ. user_ratings = [
    # {"movieId": 1,  "rating": 4.5},
    # {"movieId": 32, "rating": 5.0},
    # {"movieId": 10, "rating": 3.0}
    # ] 
    # γίνεται user_rated = {1: 4.5, 32: 5.0, 10: 3.0}
    user_rated = {r["movieId"]: r["rating"] for r in user_ratings}
    user_mean = sum(user_rated.values()) / len(user_rated) # μέσος όρος ratings του χρήστη
 
    conn = get_db_connection()
 
    # Βρίσκουμε χρήστες που έχουν βαθμολογήσει τουλάχιστον μία κοινή ταινία
    movie_ids = list(user_rated.keys()) # φτιάχνουμε λίστα με τα movieId που έχει βαθμολογήσει ο χρήστης π.χ. [1, 32, 10]

    # χρησιμοποιούμε placeholders για να περάσουμε δυναμικά τα movieId στο query 
    # π.χ. SELECT * FROM ratings WHERE movieId IN (1, 32,10) -> placeholders = "?, ?, ?"
    placeholders = ",".join("?" * len(movie_ids)) 
 
    # Ποιοι άλλοι χρήστες έχουν βαθμολογήσει έστω και μία από τις ταινίες που βαθμολόγησε ο δικός μου χρήστης
    neighbor_rows = conn.execute(
        f"SELECT DISTINCT userId FROM ratings WHERE movieId IN ({placeholders})",
        movie_ids
    ).fetchall() # το αποτέλεσμα είναι μια λίστα από dictionaries με τα userId των γειτόνων π.χ. [{"userId": 5}, {"userId": 12}, ...])
    neighbor_ids = [row["userId"] for row in neighbor_rows] # απομονώνουμε μόνο τα userId σε μια λίστα π.χ. [5, 12, ...]
 
    if not neighbor_ids: 
        conn.close()
        return []
 
    # Φορτώνουμε όλα τα ratings των γειτόνων μαζικά
    n_placeholders = ",".join("?" * len(neighbor_ids))
    all_rows = conn.execute(
        f"SELECT userId, movieId, rating FROM ratings WHERE userId IN ({n_placeholders})",
        neighbor_ids
    ).fetchall()
 
    # Οργανώνουμε: {userId: {movieId: rating}} π.χ. {5: {1: 4.0, 10: 2.0}, 12: {32: 5.0, 10: 3.0}, ...}
    neighbor_ratings: dict = {}
    for row in all_rows:
        uid = row["userId"]
        if uid not in neighbor_ratings:
            neighbor_ratings[uid] = {}
        neighbor_ratings[uid][row["movieId"]] = row["rating"]
 
    # Υπολογίζουμε Pearson για κάθε γείτονα
    similarities = []
    # παίρνουμε τις ταινίες που ταινίες έχει βαθμολογήσει ο δικός μου χρήστης (user_rated) και 
    # ταυτόχρονα υπάρχουν και στις βαθμολογίες του γείτονα v (v_ratings)
    for uid, v_ratings in neighbor_ratings.items():
        common_movies = [mid for mid in user_rated if mid in v_ratings]
        if len(common_movies) < 2: # Αν έχουμε λιγότερες από 2 κοινές ταινίες, δεν μπορούμε να υπολογίσουμε την συσχέτιση, οπότε το αγνοούμε
            continue
        u_vals = [user_rated[m] for m in common_movies]
        v_vals = [v_ratings[m] for m in common_movies]
        sim = pearson_correlation(u_vals, v_vals)
        if sim > 0:
            similarities.append((uid, sim)) # λίστα από tuples
 
    # TOP_K πιο παρόμοιοι χρήστες
    similarities.sort(key=lambda x: x[1], reverse=True) # sort by similarity score σε φθίνουσα σειρά
    top_neighbors = similarities[:TOP_K]
 
    if not top_neighbors:
        conn.close()
        return []
 
    # Μέσος όρος ratings του κάθε γείτονα (θα χρειαστεί για την πρόβλεψη)
    neighbor_means = {}
    for uid, _ in top_neighbors:
        v_r = neighbor_ratings[uid]
        neighbor_means[uid] = sum(v_r.values()) / len(v_r)
 
    # Candidate movies: βαθμολογήθηκαν από γείτονες αλλά ΟΧΙ από τον χρήστη
    candidate_movies = set()
    for uid, _ in top_neighbors:
        for mid in neighbor_ratings[uid]:
            if mid not in user_rated:
                candidate_movies.add(mid)
 
    if not candidate_movies:
        conn.close()
        return []
 
    # Τύπος εκφώνησης: r̂(u,i) = mean_u + Σ[sim(u,v)*(r(v,i)-mean_v)] / Σ|sim(u,v)|
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
        predicted = max(0.5, min(5.0, predicted)) # περιορίζουμε το rating στο εύρος 0.5 - 5.0 (clamping)
        predictions.append((mid, round(predicted, 4)))
 
    # TOP_N ταινίες με τη μεγαλύτερη προβλεπόμενη βαθμολογία
    predictions.sort(key=lambda x: x[1], reverse=True)
    top_predictions = predictions[:TOP_N]
 
    if not top_predictions:
        conn.close()
        return []
 
    # Ανακτούμε τίτλους και genres από τη βάση
    top_ids = [p[0] for p in top_predictions] # top_predictions = λίστα από (movieId, predictedRating) άρα top_ids = [movieId1, movieId2, ...]
    id_placeholders = ",".join("?" * len(top_ids))
    movie_rows = conn.execute(
        f"SELECT movieId, title, genres FROM movies WHERE movieId IN ({id_placeholders})",
        top_ids
    ).fetchall()
    conn.close()
 
    movie_info = {row["movieId"]: row for row in movie_rows}
 
    result = []
    for mid, pred_rating in top_predictions:
        if mid in movie_info:
            m = movie_info[mid]
            result.append({
                "movieId": m["movieId"],
                "title": m["title"],
                "genres": m["genres"],
                "predictedRating": pred_rating,
            })
 
    return result