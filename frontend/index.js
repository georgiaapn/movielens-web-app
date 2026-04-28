const API_BASE_URL = "http://localhost:3000/movielens/api";

// Καλάθι προσωρινών βαθμολογιών χρήστη
let userRatings = [];

// ─────────────────────────────────────────────────────────────────────────────
// 1. ΑΝΑΖΗΤΗΣΗ ΚΑΙ ΕΜΦΑΝΙΣΗ ΤΑΙΝΙΩΝ (GET /movies)
// ─────────────────────────────────────────────────────────────────────────────
async function searchMovies(query = "") {
  const grid = document.getElementById("moviesGrid");
  const subtitle = document.getElementById("moviesSubtitle");
  grid.innerHTML = '<p class="loading-text">Loading...</p>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/movies?search=${encodeURIComponent(query)}`);
    const data = await response.json();
    
    // Επειδή αν δεν βάλουμε query θα φέρει 9000 ταινίες, δείχνουμε τις πρώτες 100 για να μην κολλήσει ο browser
    const moviesToShow = data.movies.slice(0, 100); 
    
    grid.innerHTML = "";
    subtitle.innerText = query ? `Showing results for "${query}" (${data.movies.length} total)` : `Showing first 100 movies`;

    if (moviesToShow.length === 0) {
      grid.innerHTML = "<p>No movies found.</p>";
      return;
    }

    moviesToShow.forEach(movie => {
      const card = createMovieCard(movie);
      grid.appendChild(card);
    });
  } catch (error) {
    grid.innerHTML = "<p class='error'>Failed to load movies. Is the backend running?</p>";
  }
}

// Βοηθητική συνάρτηση για δημιουργία κάρτας ταινίας (DOM Element)
function createMovieCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";
  
  // Ασφαλής τίτλος για το JavaScript (escaping)
  const safeTitle = movie.title.replace(/'/g, "&#39;").replace(/"/g, "&quot;");

  card.innerHTML = `
    <h3 class="movie-title">${movie.title}</h3>
    <p class="movie-genres">${movie.genres || "No genres"}</p>
    
    <button class="details-btn" onclick="openDetails(${movie.movieId}, '${safeTitle}', '${movie.genres}')">
      View All Ratings
    </button>
    
    <div class="rating-controls">
      <input type="number" id="rating-${movie.movieId}" class="rating-input" min="0.5" max="5" step="0.5" placeholder="0-5">
      <button class="rate-btn" onclick="rateMovie(${movie.movieId})">Rate</button>
    </div>
  `;
  return card;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ΠΡΟΣΘΗΚΗ ΒΑΘΜΟΛΟΓΙΑΣ ΑΠΟ ΤΟΝ ΧΡΗΣΤΗ (Frontend State)
// ─────────────────────────────────────────────────────────────────────────────
function rateMovie(movieId) {
  const inputEl = document.getElementById(`rating-${movieId}`);
  const ratingValue = parseFloat(inputEl.value);

  if (isNaN(ratingValue) || ratingValue < 0.5 || ratingValue > 5) {
    alert("Please enter a rating between 0.5 and 5.0");
    return;
  }

  // Έλεγχος αν την έχει ξαναβαθμολογήσει
  const existingIndex = userRatings.findIndex(r => r.movieId === movieId);
  if (existingIndex > -1) {
    userRatings[existingIndex].rating = ratingValue; // Ανανέωση βαθμού
  } else {
    userRatings.push({ movieId: movieId, rating: ratingValue }); // Νέα προσθήκη
  }

  updateRatingsCounter();
  inputEl.style.borderColor = "green"; // Οπτική επιβεβαίωση
  setTimeout(() => inputEl.style.borderColor = "#555", 1000);
}

function updateRatingsCounter() {
  document.getElementById("ratedCount").innerText = `${userRatings.length} movies rated`;
}

document.getElementById("clearRatingsBtn").addEventListener("click", () => {
  userRatings = [];
  updateRatingsCounter();
  document.getElementById("recsGrid").innerHTML = "";
  alert("Ratings cleared!");
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ΛΗΨΗ ΣΥΣΤΑΣΕΩΝ (POST /recommendations)
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById("getRecsBtn").addEventListener("click", async () => {
  const recsGrid = document.getElementById("recsGrid");
  
  if (userRatings.length === 0) {
    alert("Please rate at least one movie first!");
    return;
  }

  recsGrid.innerHTML = '<p class="loading-text">Calculating recommendations...</p>';

  try {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ratings: userRatings })
    });

    const data = await response.json();
    recsGrid.innerHTML = "";

    if (!data.recommendations || data.recommendations.length === 0) {
      recsGrid.innerHTML = "<p>No recommendations found. Try rating different movies.</p>";
      return;
    }

    data.recommendations.forEach(movie => {
      const card = document.createElement("div");
      card.className = "movie-card";
      card.style.borderColor = "gold";
      card.innerHTML = `
        <h3 class="movie-title">${movie.title}</h3>
        <p class="movie-genres">${movie.genres}</p>
        <div class="pred-rating">Predicted Rating: ★ ${movie.predictedRating.toFixed(2)}</div>
      `;
      recsGrid.appendChild(card);
    });

  } catch (error) {
    recsGrid.innerHTML = "<p class='error'>Error fetching recommendations.</p>";
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ΠΡΟΒΟΛΗ ΒΑΘΜΟΛΟΓΙΩΝ ΤΑΙΝΙΑΣ - MODAL (GET /ratings/{movieId})
// ─────────────────────────────────────────────────────────────────────────────
async function openDetails(movieId, title, genres) {
  document.getElementById("detailsTitle").innerText = title;
  document.getElementById("detailsGenres").innerText = genres;
  document.getElementById("detailsModal").classList.remove("hidden");
  
  const listEl = document.getElementById("detailsRatingsList");
  const avgEl = document.getElementById("detailsAvgRating");
  const countEl = document.getElementById("detailsRatingCount");
  
  listEl.innerHTML = "Loading ratings...";
  avgEl.innerText = "—";
  countEl.innerText = "";

  try {
    const response = await fetch(`${API_BASE_URL}/ratings/${movieId}`);
    const data = await response.json();
    const ratings = data.ratings;

    if (ratings.length === 0) {
      listEl.innerHTML = "<p>No ratings yet for this movie.</p>";
      return;
    }

    // Υπολογισμός Μέσου Όρου
    const sum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = (sum / ratings.length).toFixed(1);
    
    avgEl.innerText = `★ ${avg}`;
    countEl.innerText = `(${ratings.length} reviews)`;

    // Εμφάνιση λίστας (έως 50 για να μην κολλήσει το modal)
    listEl.innerHTML = ratings.slice(0, 50).map(r => 
      `<div class="rating-item">User ${r.userId} rated <strong>${r.rating}</strong></div>`
    ).join("");

  } catch (error) {
    listEl.innerHTML = "<p class='error'>Could not load ratings.</p>";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. ΠΡΟΣΘΗΚΗ ΝΕΑΣ ΤΑΙΝΙΑΣ (POST /movies)
// ─────────────────────────────────────────────────────────────────────────────
document.getElementById("submitAddMovie").addEventListener("click", async () => {
  const title = document.getElementById("newTitle").value.trim();
  const genres = document.getElementById("newGenres").value.trim();
  const feedback = document.getElementById("addFeedback");

  if (!title) {
    showFeedback("Title is required!", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/movies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title, genres: genres })
    });

    const data = await response.json();
    
    if (data.status === "success") {
      showFeedback(`Success! Movie ID: ${data.movieId}`, "success");
      document.getElementById("newTitle").value = "";
      document.getElementById("newGenres").value = "";
      // Ανανέωση της λίστας για να φανεί η νέα ταινία
      searchMovies(); 
    } else {
      showFeedback("Failed to add movie.", "error");
    }
  } catch (error) {
    showFeedback("Server error.", "error");
  }
});

function showFeedback(msg, type) {
  const fb = document.getElementById("addFeedback");
  fb.innerText = msg;
  fb.className = `feedback ${type}`;
  fb.classList.remove("hidden");
  setTimeout(() => fb.classList.add("hidden"), 4000);
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS & ΑΡΧΙΚΟΠΟΙΗΣΗ
// ─────────────────────────────────────────────────────────────────────────────

// Search Enter Key & Click
document.getElementById("searchBtn").addEventListener("click", () => {
  searchMovies(document.getElementById("searchInput").value);
});
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") searchMovies(e.target.value);
});

// Modals Open/Close
document.getElementById("openAddModal").addEventListener("click", () => {
  document.getElementById("addMovieModal").classList.remove("hidden");
});
document.getElementById("closeAddModal").addEventListener("click", () => {
  document.getElementById("addMovieModal").classList.add("hidden");
});
document.getElementById("closeDetailsModal").addEventListener("click", () => {
  document.getElementById("detailsModal").classList.add("hidden");
});

// Κλείσιμο Modals όταν πατάς έξω από το κουτί
window.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal-overlay")) {
    e.target.classList.add("hidden");
  }
});

// Αρχική φόρτωση ταινιών
searchMovies("");