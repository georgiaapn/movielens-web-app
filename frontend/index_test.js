const API_BASE_URL = "http://127.0.0.1:3000/movielens/api";
const MOVIES_PER_PAGE = 12;

let currentPage = 1;
let allMovies = []; // Εδώ θα μπαίνουν οι πραγματικές ταινίες από τη βάση
let filteredMovies = [];

// 1. Φόρτωση ταινιών από το Backend
async function fetchMovies(query = "") {
    try {
        const response = await fetch(`${API_BASE_URL}/movies?search=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        // Προσαρμογή ανάλογα με τη δομή που επιστρέφει το API σου
        allMovies = Array.isArray(data) ? data : (data.movies || []);
        filteredMovies = [...allMovies];
        
        currentPage = 1;
        renderMovies();
        renderPagination();
    } catch (error) {
        console.error("Error fetching movies:", error);
        document.getElementById('moviesGrid').innerHTML = 
            '<p style="color: white; padding: 20px;">Αποτυχία σύνδεσης με το Backend. Σιγουρευτείτε ότι το uvicorn τρέχει.</p>';
    }
}

// 2. Δημιουργία HTML για την κάρτα (με τα σωστά πεδία της βάσης)
function createMovieCard(movie) {
    // Επειδή η βάση δεν έχει έτοιμο μέσο όρο αστεριών στο search, 
    // βάζουμε ένα τυχαίο για το UI που παράγει είτε δεκαδικούς με .5 είτε εντελώς ακέραιους μεταξύ 1.0 και 5.0 για να φαίνεται πιο ρεαλιστικό.
    const displayRating = (Math.floor(Math.random() * 5) + 0.5).toFixed(1);
 

    return `
        <div class="movie-card">
            <div class="movie-name">${movie.title}</div>
            <div class="movie-info">
                <div class="stars">${createStarRating(displayRating)}</div>
                <span class="rating-count">${displayRating}</span>
            </div>
        </div>
    `;
}

// Βοηθητική συνάρτηση για τα αστέρια
function createStarRating(rating) {
    let stars = '';
    const numRating = parseFloat(rating);
    const fullStars = Math.floor(numRating);
    
    // Ελέγχουμε αν το δεκαδικό μέρος είναι 0.5
    const hasHalfStar = (numRating % 1) === 0.5; 

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            // Πλήρως γεμάτο αστέρι
            stars += `<span class="star">★</span>`; 
        } else if (i === fullStars && hasHalfStar) {
            // Μισογεμάτο αστέρι
            stars += `<span class="star half">★</span>`; 
        } else {
            // Άδειο αστέρι
            stars += `<span class="star empty">★</span>`; 
        }
    }
    return stars;
}

// 3. Render functions
function renderMovies() {
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    const endIndex = startIndex + MOVIES_PER_PAGE;
    const paginatedMovies = filteredMovies.slice(startIndex, endIndex);

    const moviesGrid = document.getElementById('moviesGrid');
    if (paginatedMovies.length === 0) {
        moviesGrid.innerHTML = '<p style="color: white; padding: 20px;">No movies found.</p>';
        return;
    }
    moviesGrid.innerHTML = paginatedMovies.map(movie => createMovieCard(movie)).join('');
}

// 4. Pagination & Navigation
function renderPagination() {
    const totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    let html = `
        <button class="pagination-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
            ❮
        </button>
    `;

    // Λογική για εμφάνιση σελίδων στυλ: 1 2 3 ... 99
    const range = 2; // Πόσες σελίδες γύρω από την τρέχουσα
    
    for (let i = 1; i <= totalPages; i++) {
        // Εμφανίζουμε την πρώτη, την τελευταία, και τις σελίδες γύρω από την τρέχουσα
        if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
            html += `
                <button class="pagination-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        } 
        // Προσθήκη αποσιωπητικών (...) αν υπάρχει μεγάλο κενό
        else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    html += `
        <button class="pagination-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>
            ❯
        </button>
    `;

    pagination.innerHTML = html;
}
function goToPage(page) {
    currentPage = page;
    renderMovies();
    renderPagination();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function changePage(step) {
    goToPage(currentPage + step);
}

// 5. Search & Events
document.addEventListener('DOMContentLoaded', () => {
    // Αρχική φόρτωση από τη βάση
    fetchMovies();

    const searchInput = document.getElementById('searchInput');
    let timeout = null;

    searchInput.addEventListener('input', (e) => {
        // Debounce: περιμένουμε λίγο πριν κάνουμε το αίτημα στο API
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            fetchMovies(e.target.value);
        }, 300);
    });
});

function handleRate(movieId) {
    alert(`Rating for Movie ID: ${movieId}`);
}