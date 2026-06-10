const API_BASE_URL = "http://127.0.0.1:3000/movielens/api";
const MOVIES_PER_PAGE = 12;

let currentPage = 1;
let allMovies = []; // Εδώ θα μπαίνουν οι πραγματικές ταινίες από τη βάση
let filteredMovies = [];
let recommendedMovies = []; // Για να αποθηκεύουμε τις ταινίες που επιστρέφει ο Pearson
let activeRecIndex = 0;     // Για να ξέρουμε ποια ταινία είναι στο κέντρο του carousel

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
            '<p style="color: white; padding: 20px;">Failed to connect to Backend. Please ensure that the uvicorn server is running.</p>';
    }
}

// 2. Δημιουργία HTML για την κάρτα (με τα σωστά πεδία της βάσης)
function createMovieCard(movie) {
    // Επειδή η βάση δεν έχει έτοιμο μέσο όρο αστεριών στο search, 
    // βάζουμε ένα τυχαίο για το UI που παράγει είτε δεκαδικούς με .5 είτε εντελώς ακέραιους μεταξύ 1.0 και 5.0 για να φαίνεται πιο ρεαλιστικό.
    const displayRating = (Math.floor(Math.random() * 5) + 0.5).toFixed(1);
 

    return `
        <div class="movie-card" style="cursor: pointer;" onclick="showMovieDetails(${movie.movieId})">
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

// --- ΝΕΑ ΣΥΝΑΡΤΗΣΗ: Υπολογισμός Average Rating από το API ---
async function fetchAverageRating(movieId) {
    try {
        const response = await fetch(`${API_BASE_URL}/ratings/${movieId}`); //
        const data = await response.json();

        if (data.status === "success" && data.ratings.length > 0) {
            // Υπολογισμός μέσου όρου
            const sum = data.ratings.reduce((acc, curr) => acc + curr.rating, 0);
            const avg = sum / data.ratings.length;
            return avg.toFixed(1); // Επιστρέφει π.χ. "4.2"
        }
        return "N/A"; // Αν δεν υπάρχουν βαθμολογίες
    } catch (error) {
        console.error(`Error fetching ratings for movie ${movieId}:`, error);
        return "Error";
    }
}

// --- Τροποποιημένη renderMovies ---
function renderMovies() {
    const movieGrid = document.getElementById('moviesGrid');
    if (!movieGrid) return;
    
    movieGrid.innerHTML = ''; 

    // Παίρνουμε μόνο τις ταινίες της τρέχουσας σελίδας
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    const moviesToRender = filteredMovies.slice(startIndex, startIndex + MOVIES_PER_PAGE);

    moviesToRender.forEach(async (movie) => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.style.cursor = 'pointer';
        // Προσθήκη του click event για να ανοίγει το details view
        movieCard.onclick = () => showMovieDetails(movie.movieId);
        
        // Χρησιμοποιούμε την αρχική σου δομή HTML
            movieCard.innerHTML = `
                <div class="movie-name">${movie.title}</div>
                <div class="movie-info">
                    <div class="stars" id="stars-${movie.movieId}">
                        ${createStarRating(0)}
                    </div>
                    <span class="rating-count" id="rating-${movie.movieId}">...</span>
                </div>
            `;
        
        movieGrid.appendChild(movieCard);

        // Ανάκτηση πραγματικού rating
        const avgRating = await fetchAverageRating(movie.movieId);
        
        // Ενημέρωση κειμένου βαθμολογίας
        const ratingElement = document.getElementById(`rating-${movie.movieId}`);
        if (ratingElement) {
            ratingElement.textContent = avgRating;
        }

        // Ενημέρωση αστεριών (χρησιμοποιώντας τη συνάρτηση που ήδη έχεις)
        const starsElement = document.getElementById(`stars-${movie.movieId}`);
            if (starsElement) {
                const ratingValue = (avgRating === "N/A" || avgRating === "Error") ? 0 : avgRating;
                starsElement.innerHTML = createStarRating(ratingValue);
            }
    });
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

// ==========================================
// DETAILS VIEW LOGIC
// ==========================================
let currentSelectedMovieId = null;
let currentRating = 0;

function showMovieDetails(movieId) {
    const movie = allMovies.find(m => m.movieId === movieId);
    if (!movie) return;
    
    currentSelectedMovieId = movieId;

    // --- ΕΞΥΠΝΗ ΑΝΑΚΤΗΣΗ ΒΑΘΜΟΛΟΓΙΑΣ ---
    // Κοιτάμε αν υπάρχει ήδη βαθμολογία στο session για το συγκεκριμένο ID
    const savedRatings = JSON.parse(sessionStorage.getItem('movieRatings')) || {};
    
    if (savedRatings[movieId]) {
        // Αν υπάρχει, την επαναφέρουμε!
        currentRating = savedRatings[movieId];
        document.getElementById('detailFeedback').textContent = `You previously rated this ${currentRating}/5.`;
    } else {
        // Αν όχι, ξεκινάμε από το μηδέν
        currentRating = 0; 
        document.getElementById('detailFeedback').textContent = "Select a rating to continue.";
    }
    
    // Ενημερώνουμε τα αστέρια στην οθόνη βάσει του currentRating
    updateStarsUI();

    // Διαχωρισμός Τίτλου και Έτους (Regex για να βρει την παρένθεση)
    const match = movie.title.match(/(.+?)\s*(\(\d{4}\))?$/);
    const titleOnly = match ? match[1] : movie.title;
    const yearOnly = (match && match[2]) ? match[2] : "";

    // Αλλαγή των genres (από Action|Comedy σε ACTION • COMEDY)
    const formattedGenres = movie.genres ? movie.genres.split('|').join(' • ') : "UNKNOWN";

    document.getElementById('detailTitle').textContent = titleOnly;
    document.getElementById('detailYear').textContent = yearOnly;
    document.getElementById('detailGenres').textContent = formattedGenres;

    // Εναλλαγή Οθονών
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('recommendationsView').classList.add('hidden');
    document.getElementById('detailsView').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideMovieDetails() {
    document.getElementById('detailsView').classList.add('hidden');
    document.getElementById('recommendationsView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
}

// Επιστροφή στην αρχική από το λογότυπο
function returnToHome() {
    // Σιγουρευόμαστε ότι το Home είναι ορατό και το Details κρυφό
    document.getElementById('detailsView').classList.add('hidden');
    document.getElementById('recommendationsView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    
    // Κάνουμε ομαλό scroll τέρμα πάνω!
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Λογική για τα Αστέρια στο δεξί panel (Μισά & Ολόκληρα)
const detailStars = document.querySelectorAll('.details-star');
const detailFeedback = document.getElementById('detailFeedback');
const starContainer = document.getElementById('detailRatingStars');

detailStars.forEach((star, index) => {
    // Συνάρτηση που βρίσκει αν το ποντίκι είναι στο αριστερό (< 50%) ή δεξί μισό
    const calculateRating = (e) => {
        const isHalf = e.offsetX < e.target.offsetWidth / 2;
        return index + (isHalf ? 0.5 : 1);
    };

    star.addEventListener('mousemove', (e) => {
        updateStarsUI(calculateRating(e));
    });

    star.addEventListener('click', (e) => {
        currentRating = calculateRating(e);
        updateStarsUI(currentRating);
        detailFeedback.textContent = `You selected ${currentRating} stars. Ready to rate!`;
    });
});

if (starContainer) {
    starContainer.addEventListener('mouseleave', () => {
        updateStarsUI(currentRating);
    });
}

function updateStarsUI(ratingToDisplay = currentRating) {
    detailStars.forEach((star, index) => {
        // Ξεκινάμε κάνοντας το αστέρι "άδειο" και αφαιρώντας το "μισό"
        star.classList.add('empty');
        star.classList.remove('half');
        
        if (ratingToDisplay >= index + 1) {
            // Ολόκληρο αστέρι (Αφαιρούμε το empty, μένει το φουλ ροζ της .star)
            star.classList.remove('empty');
        } else if (ratingToDisplay > index) {
            // Μισό αστέρι (Αφαιρούμε το empty, προσθέτουμε το half)
            star.classList.remove('empty');
            star.classList.add('half');
        }
    });
}

async function renderRecommendationCarousel() {
    const carousel = document.getElementById('recommendationCarousel');
    if (!carousel) return;

    if (carousel.children.length === 0) {
        // Χρησιμοποιούμε Promise.all για να φέρουμε όλα τα ratings ταυτόχρονα
        const cardsHTML = await Promise.all(recommendedMovies.map(async (movie, index) => {
            const avgRating = await fetchAverageRating(movie.movieId);
            const ratingValue = (avgRating === "N/A" || avgRating === "Error") ? 0 : avgRating;
            const starsHTML = createStarRating(avgRating);
            
            return `
                <li class="carousel-item movie-card" id="rec-item-${index}" 
                    onclick="showMovieDetails(${movie.movieId})">
                    <div class="movie-name">${movie.title}</div>
                    <div class="movie-info">
                        <div class="stars">${starsHTML}</div>
                        <span class="rating-count">${avgRating}</span>
                    </div>
                </li>
            `;
        }));
        carousel.innerHTML = cardsHTML.join('');
    }

    // Ενημέρωση ενεργής κλάσης
    const items = carousel.querySelectorAll('.carousel-item');
    items.forEach((item, index) => {
        if (index === activeRecIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    requestAnimationFrame(scrollToActive);
}

function setActiveRec(index) {
    activeRecIndex = index;
    renderRecommendationCarousel();
}

function moveCarousel(step) {
    if (recommendedMovies.length === 0) return;

    // Υπολογισμός νέου index
    activeRecIndex = (activeRecIndex + step + recommendedMovies.length) % recommendedMovies.length;
    
    // Επανασχεδιασμός για να αλλάξει η κλάση .active (πυροδοτεί το CSS transition)
    renderRecommendationCarousel();
    
    // Smooth κύλιση προς το νέο κέντρο
    setTimeout(scrollToActive, 10);
}

function scrollToActive() {
    const activeItem = document.querySelector(".carousel-item.active");
    if (activeItem) {
        activeItem.scrollIntoView({ 
            behavior: "smooth", // Εξασφαλίζει smooth κίνηση
            block: "nearest", 
            inline: "center"   // Φέρνει το στοιχείο ακριβώς στη ΜΕΣΗ
        });
    }
}


// Υποβολή Βαθμολογίας
document.getElementById('detailRateBtn').addEventListener('click', () => {
    if (currentRating === 0) {
        detailFeedback.textContent = "Please select a rating first.";
        return;
    }
    
    // Αποθήκευση ΜΟΝΟ για το τρέχον session ---
    // 1. Παίρνουμε τις υπάρχουσες βαθμολογίες του session
    const savedRatings = JSON.parse(sessionStorage.getItem('movieRatings')) || {};
    
    // 2. Προσθέτουμε/Ενημερώνουμε τη βαθμολογία για τη συγκεκριμένη ταινία
    savedRatings[currentSelectedMovieId] = currentRating;
    
    // 3. Αποθηκεύουμε ξανά στο sessionStorage
    sessionStorage.setItem('movieRatings', JSON.stringify(savedRatings));
    // -------------------------------------------------------------

    // Διαβάζουμε τον τίτλο της ταινίας κατευθείαν από το HTML στοιχείο
    const movieTitle = document.getElementById('detailTitle').textContent;
    
    // Εμφανίζουμε το μήνυμα επιτυχίας με τον τίτλο
    detailFeedback.textContent = `Success! Rated ${currentRating}/5 for movie: ${movieTitle}`;

});

// ==========================================
// FLOATING MENU LOGIC
// ==========================================
const menuBtn = document.getElementById('menuBtn');
const floatingMenu = document.getElementById('floatingMenu');
const menuClose = document.getElementById('menuClose');

// Συνάρτηση που ανοίγει/κλείνει το μενού
function setMenuOpen(open) {
    // Κρατάμε ΜΟΝΟ αυτή τη γραμμή. Το CSS θα αναλάβει πλέον όλη τη μαγεία της εμφάνισης!
    document.body.classList.toggle("menu-open", open);
}

// Κλικ στο Hamburger icon
menuBtn.addEventListener('click', () => {
    const isOpen = document.body.classList.contains("menu-open");
    setMenuOpen(!isOpen);
});

// Κλικ στο κουμπί X
menuClose.addEventListener('click', () => {
    setMenuOpen(false);
});

// Κλείσιμο αν ο χρήστης πατήσει το πλήκτρο Escape στο πληκτρολόγιο
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setMenuOpen(false);
    }
});

// Κλείσιμο αν ο χρήστης κάνει κλικ στο θολό υπόβαθρο
document.getElementById('screenBlur').addEventListener('click', () => {
    setMenuOpen(false);
});

// --- Modal Elements ---
const addMovieBtn = Array.from(document.querySelectorAll('.floating-menu button')).find(btn => btn.textContent.includes('+ Add a movie'));
const addMovieModal = document.getElementById('addMovieModal');
const backdrop = document.getElementById('backdrop');
const cancelBtn = document.getElementById('cancelBtn');
const addMovieForm = document.getElementById('addMovieForm');

// --- Νέα Συνάρτηση για τα μηνύματα (Toast) ---
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    
    // Αφαιρούμε παλιές κλάσεις και βάζουμε τις νέες
    toast.classList.remove('success', 'error', 'show');
    toast.classList.add(type);
    
    // Μικρή καθυστέρηση για να εφαρμόσει ο browser την αλλαγή
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Κρύβουμε το μήνυμα αυτόματα μετά από 3.5 δευτερόλεπτα
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// --- Συνάρτηση για απαλό κλείσιμο του Modal ---
function closeModalSmoothly() {
    addMovieModal.classList.add('is-closing');
    backdrop.classList.add('is-closing');

    setTimeout(() => {
        addMovieModal.close();
        backdrop.hidden = true;
        addMovieModal.classList.remove('is-closing');
        backdrop.classList.remove('is-closing');
    }, 300); // 300ms όση και η διάρκεια του CSS animation
}

// Άνοιγμα Modal
addMovieBtn.addEventListener('click', () => {
    setMenuOpen(false); 
    backdrop.hidden = false;
    addMovieModal.showModal();
});

// Κλείσιμο Modal (Cancel)
cancelBtn.addEventListener('click', () => {
    closeModalSmoothly();
});

// Υποβολή Φόρμας
addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('movieTitleInput').value;
    const genreSelect = document.getElementById('movieGenreSelect');
    
    const selectedGenres = Array.from(genreSelect.selectedOptions)
                                .map(option => option.value)
                                .join('|');

    try {
        const response = await fetch(`${API_BASE_URL}/movies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                genres: selectedGenres
            })
        });

        const result = await response.json();

        if (!response.ok || result.status === "fail" || result.detail?.status === "fail") {
            throw new Error(
                result.message ||
                result.detail?.message ||
                `Server error: ${response.status}`
            );
        }

        const newMovie = {
            movieId: result.movieId,
            title: title,
            genres: selectedGenres
        };

        allMovies.unshift(newMovie);
        filteredMovies = [...allMovies];
        
        renderMovies();
        addMovieForm.reset();
        
        // 1. Κλείνουμε το modal απαλά
        closeModalSmoothly(); 
        
        // 2. Εμφανίζουμε το κομψό μήνυμα επιτυχίας!
        showToast(`Movie "${title}" saved successfully!`, 'success');

    } catch (error) {
        console.error("Σφάλμα κατά την αποθήκευση:", error);
        
        // Σε περίπτωση αποτυχίας, το modal μπορεί να μείνει ανοιχτό και να βγάλει το κόκκινο μήνυμα
        showToast(`Could not save the movie. ${error.message}`, 'error');
    }
});

// Σύνδεση του κουμπιού Get Recommendations
document.querySelector('.floating-action--secondary').addEventListener('click', async () => {
    setMenuOpen(false);
    
    const savedRatings = JSON.parse(sessionStorage.getItem('movieRatings')) || {};
    
    if (Object.keys(savedRatings).length === 0) {
        showToast("Please rate some movies first!", "error");
        return;
    }

    const ratingsArray = Object.entries(savedRatings).map(([id, rating]) => ({
        movieId: parseInt(id),
        rating: rating
    }));

    try {
        const response = await fetch(`${API_BASE_URL}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ratings: ratingsArray })
        });

        const data = await response.json();

        if (data.status === "success" && data.recommendations && data.recommendations.length > 0) {
            recommendedMovies = data.recommendations;
            activeRecIndex = 0; 
            
            document.getElementById('recommendationCarousel').innerHTML = '';
            renderRecommendationCarousel();
            
            // Αλλαγή view μόνο αν υπάρχουν ταινίες
            document.getElementById('homeView').classList.add('hidden');
            document.getElementById('detailsView').classList.add('hidden');
            document.getElementById('recommendationsView').classList.remove('hidden');
            
        } else {
            // Αν η λίστα είναι κενή, εμφανίζουμε ένα φιλικό μήνυμα
            showToast("Help us get to know you better! Rate a few more movies and we’ll find your perfect picks.", "error");
        }
    } catch (error) {
        showToast("Failed to connect to the recommendation engine.", "error");
    }
});

// Κλείσιμο αν πατηθεί το backdrop
backdrop.addEventListener('click', () => {
    closeModalSmoothly();
});
