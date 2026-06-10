const API_BASE_URL = "http://127.0.0.1:3000/movielens/api";
const MOVIES_PER_PAGE = 12;

let currentPage = 1;
let allMovies = []; // Here we will store all movies fetched from the backend.
let filteredMovies = [];
let recommendedMovies = []; // For storing the movies returned by the Pearson correlation
let activeRecIndex = 0;     // For keeping track of which movie is at the center of the carousel

// 1. Load Movies from Backend
async function fetchMovies(query = "") {
    try {
        const response = await fetch(`${API_BASE_URL}/movies?search=${encodeURIComponent(query)}`);
        // encodeURIComponent: makes user's search text safe for URL encoding
        const data = await response.json();
        
        allMovies = data.movies || []; // store data.movies or an empty array if it's undefined
        filteredMovies = [...allMovies]; // new array reference, with the same content as allMovies
        
        currentPage = 1; // reset to first page on new search
        renderMovies();
        renderPagination();
    } catch (error) {
        console.error("Error fetching movies:", error);
        // innerHTML: gets element with id moviesGrid and sets its content to a message about the connection failure
        document.getElementById('moviesGrid').innerHTML = 
            '<p style="color: white; padding: 20px;">Failed to connect to Backend. Please ensure that the uvicorn server is running.</p>';
    }
}

// Helper function to create star rating HTML string based on a numeric rating (e.g., 4.5)
function createStarRating(rating) {
    let stars = '';
    const numRating = parseFloat(rating); // Convert to number in case it's a string
    const fullStars = Math.floor(numRating); // Number of fully filled stars
    
    // boolean variable to check if the decimal part is 0.5
    const hasHalfStar = (numRating % 1) === 0.5; 

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            // Fully filled star
            stars += `<span class="star">★</span>`; 
        } else if (i === fullStars && hasHalfStar) {
            // Half-filled star
            stars += `<span class="star half">★</span>`; 
        } else {
            // Empty star
            stars += `<span class="star empty">★</span>`; 
        }
    }
    return stars;
}

// Calculates average rating for a given movieId by fetching all ratings and computing the average
async function fetchAverageRating(movieId) {
    try {
        const response = await fetch(`${API_BASE_URL}/ratings/${movieId}`); //
        const data = await response.json();

        if (data.status === "success" && data.ratings.length > 0) {
            // Calculate average rating
            let sum = 0;
            for (const curr of data.ratings) {
                sum += curr.rating;
            }
            const avg = sum / data.ratings.length;
            return avg.toFixed(1); // Returns result with one decimal place, e.g., "4.5"
        }
        return "N/A"; // If no ratings exist
    } catch (error) {
        console.error(`Error fetching ratings for movie ${movieId}:`, error);
        return "Error";
    }
}


function renderMovies() {
    const movieGrid = document.getElementById('moviesGrid'); // finds <div id="moviesGrid">
    if (!movieGrid) return; // safety check to ensure the element exists before trying to manipulate it
    
    movieGrid.innerHTML = ''; // Clear previous movies before rendering new ones

    // Getting current page movies based on pagination logic
    // for example, if currentPage = 1 -> movies 0 to 11
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    // slice() creates the subset of movies to render based on the current page and MOVIES_PER_PAGE
    const moviesToRender = filteredMovies.slice(startIndex, startIndex + MOVIES_PER_PAGE);

    // for each movie in moviesToRender, we create a card and append it to the movieGrid
    moviesToRender.forEach(async (movie) => {
        const movieCard = document.createElement('div');
        movieCard.className = 'movie-card';
        movieCard.style.cursor = 'pointer'; // make it clear that the card is clickable
        //  click event to open details view
        movieCard.onclick = () => showMovieDetails(movie.movieId);
        
        // Fill the inside of the card with the movie title and a placeholder for the rating
        // (which will be updated after fetching)
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

        // Retrieve actual rating
        const avgRating = await fetchAverageRating(movie.movieId);
        
        // Update rating text
        // getElementById: finds the element with id rating-{movieId} and updates its text content to the average rating
        const ratingElement = document.getElementById(`rating-${movie.movieId}`);
        if (ratingElement) {
            ratingElement.textContent = avgRating;
        }

        // Update star ratings (using the function we already have)
        const starsElement = document.getElementById(`stars-${movie.movieId}`);
            if (starsElement) {
                // if avgRating is "N/A" or "Error", we treat it as 0 for the star display,
                //  otherwise we use the actual average rating
                const ratingValue = (avgRating === "N/A" || avgRating === "Error") ? 0 : avgRating;
                starsElement.innerHTML = createStarRating(ratingValue);
            }
    });
}

// Pagination & Navigation
function renderPagination() {
    const totalPages = Math.ceil(filteredMovies.length / MOVIES_PER_PAGE); // calculates total pages 
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    // previous page button. If we are on the first page, it is disabled
    let html = `
        <button class="pagination-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
            ❮
        </button>
    `;

    // Logic for displaying pages: 1 2 3 ... 99
    const range = 2; // show 2 pages before and after the current page
    
    for (let i = 1; i <= totalPages; i++) {
        // We display the first, last, and pages around the current page (its range)
        if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
            // if i is the current page, we add the 'active' class to highlight it
            html += `
                <button class="pagination-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">
                    ${i}
                </button>
            `;
        } 
        // Add ellipsis (...) if there's a large gap between pages
        else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
            html += `<span class="pagination-ellipsis">...</span>`;
        }
    }

    // next page button. If we are on the last page, it is disabled
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
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll to top when changing pages
}

function changePage(step) {
    goToPage(currentPage + step);
}

// defines initialization logic that runs when the DOM content (HTML) is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initial load from the database
    fetchMovies();

    const searchInput = document.getElementById('searchInput');
    let timeout = null;

    // every time search input changes (user types, deletes etc.)
    searchInput.addEventListener('input', (e) => {
        // Debounce: we wait before making the API call
        clearTimeout(timeout); // if the user types again before 300ms, we reset the timer and wait again
        // start a 300ms timer
        // if it completes without interruption, we call fetchMovies with the current value of the search input
        timeout = setTimeout(() => {
            fetchMovies(e.target.value); // e is the event object, e.target is the input element, e.target.value is the current text in the search box
        }, 300);
    });
});

// ==========================================
// DETAILS VIEW LOGIC
// ==========================================
let currentSelectedMovieId = null;
let currentRating = 0;

function showMovieDetails(movieId) {
    const movie = allMovies.find(m => m.movieId === movieId);
    if (!movie) return;
    
    currentSelectedMovieId = movieId;

    // checks if the user has already rated this movie in the current session by looking into sessionStorage
    const savedRatings = JSON.parse(sessionStorage.getItem('movieRatings')) || {};
    
    if (savedRatings[movieId]) {
        // If found, we display it!
        currentRating = savedRatings[movieId];
        document.getElementById('detailFeedback').textContent = `You previously rated this ${currentRating}/5.`;
    } else {
        // If not, we start from zero
        currentRating = 0; 
        document.getElementById('detailFeedback').textContent = "Select a rating to continue.";
    }
    
    // Update the stars UI based on the current rating
    updateStarsUI();

    // Title and Year Separation (Regex to find the parentheses)
    // For example, if the title is "The Matrix (1999)", it will separate "The Matrix" and "(1999)"
    // match[0] = full title, match[1] = title without year, match[2] = year in parentheses (if exists)
    const match = movie.title.match(/(.+?)\s*(\(\d{4}\))?$/); 
    const titleOnly = match ? match[1] : movie.title;
    const yearOnly = (match && match[2]) ? match[2] : "";

    // Genre Formatting (from Action|Comedy to ACTION • COMEDY)
    const formattedGenres = movie.genres ? movie.genres.split('|').join(' • ') : "UNKNOWN";

    // update HTML of details view with the movie information (fills placeholders with actual data)
    document.getElementById('detailTitle').textContent = titleOnly;
    document.getElementById('detailYear').textContent = yearOnly;
    document.getElementById('detailGenres').textContent = formattedGenres;

    // screen transition to details view
    document.getElementById('homeView').classList.add('hidden'); // hide home view
    document.getElementById('recommendationsView').classList.add('hidden'); // hide recommendations view
    document.getElementById('detailsView').classList.remove('hidden'); // show details view
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll to top when opening details
}

// Return to Home Page
function returnToHome() {
    document.getElementById('detailsView').classList.add('hidden');
    document.getElementById('recommendationsView').classList.add('hidden');
    document.getElementById('homeView').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll to top when returning home
}

// Logic for interactive star rating in details view
const detailStars = document.querySelectorAll('.details-star'); // selects all elements with class 'details-star' (the 5 stars in the details view)
const detailFeedback = document.getElementById('detailFeedback');
const starContainer = document.getElementById('detailRatingStars');

// star is the element itself, index is its position (0 to 4)
detailStars.forEach((star, index) => {
    // helper function that determines mouse position (left half 50% or right half) for half-star support
    const calculateRating = (e) => {
        // if cursor offset is less than half the star's width => 
        // mouse is in the left half of the star => 
        // it's a half star
        const isHalf = e.offsetX < e.target.offsetWidth / 2; 
        return index + (isHalf ? 0.5 : 1);
    };

    // event listener for hover
    // while mouse is moving over a star, calculate the rating based on the mouse position and update the UI 
    // to show the potential rating
    star.addEventListener('mousemove', (e) => {
        updateStarsUI(calculateRating(e));
    });

    // event listener for click
    star.addEventListener('click', (e) => {
        currentRating = calculateRating(e);
        updateStarsUI(currentRating);
        detailFeedback.textContent = `You selected ${currentRating} stars. Ready to rate!`;
    });
});

// when the mouse leaves the star container, we want to reset the stars
if (starContainer) {
    starContainer.addEventListener('mouseleave', () => {
        updateStarsUI(currentRating);
    });
}

function updateStarsUI(ratingToDisplay = currentRating) {
    detailStars.forEach((star, index) => {
        // Reset all stars to empty first
        star.classList.add('empty');
        star.classList.remove('half');
        
        if (ratingToDisplay >= index + 1) {
            // fully filled star, we remove the empty class (full pink form .star remains)
            star.classList.remove('empty');
        } else if (ratingToDisplay > index) {
            // half star, we remove the empty class and add the half class (which has the gradient)
            star.classList.remove('empty');
            star.classList.add('half');
        }
    });
}

async function renderRecommendationCarousel() {
    const carousel = document.getElementById('recommendationCarousel');
    if (!carousel) return;

    if (carousel.children.length === 0) { // only fetch ratings and create cards if carousel is empty (first time rendering)
        //  Promise.all to fetch all ratings in parallel and wait for all of them to complete before rendering the carousel
        // cardsHTML will be an array of HTML strings
        const cardsHTML = await Promise.all(recommendedMovies.map(async (movie, index) => {
            const avgRating = await fetchAverageRating(movie.movieId);
            const ratingValue = (avgRating === "N/A" || avgRating === "Error") ? 0 : avgRating;
            const starsHTML = createStarRating(ratingValue);
            
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

    // Update active card
    const items = carousel.querySelectorAll('.carousel-item'); // selects all carousel cards
    items.forEach((item, index) => {
        if (index === activeRecIndex) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // requestAnimationFrame tells the browser to perform the function right before the next repaint
    requestAnimationFrame(scrollToActive); // scroll happens after the DOM has updated with the new active class
}

function setActiveRec(index) {
    activeRecIndex = index;
    renderRecommendationCarousel();
}

function moveCarousel(step) {
    if (recommendedMovies.length === 0) return;

    // calculate the new active index 
    activeRecIndex = (activeRecIndex + step + recommendedMovies.length) % recommendedMovies.length;
    
    // Redesign to change active card (triggers CSS transition)
    renderRecommendationCarousel();
    
    // Smooth scroll to the new active card
    setTimeout(scrollToActive, 10);
}

function scrollToActive() {
    const activeItem = document.querySelector(".carousel-item.active");
    if (activeItem) {
        activeItem.scrollIntoView({ 
            behavior: "smooth", // smooth scroll animation
            block: "nearest", 
            inline: "center"   // centers the active item
        });
    }
}


// Submit Rating Button Logic
document.getElementById('detailRateBtn').addEventListener('click', () => {
    if (currentRating === 0) {
        detailFeedback.textContent = "Please select a rating first.";
        return;
    }
    
    // Save only for the current session 
    // 1. Get the current session's saved ratings from sessionStorage
    const savedRatings = JSON.parse(sessionStorage.getItem('movieRatings')) || {};
    
    // 2. Updating the rating for the current movie
    savedRatings[currentSelectedMovieId] = currentRating;
    
    // 3. Save the updated ratings back to sessionStorage
    sessionStorage.setItem('movieRatings', JSON.stringify(savedRatings));

    // Get the movie title from the details view to include in the success message
    const movieTitle = document.getElementById('detailTitle').textContent;
    
    // Display success message with the selected rating and movie title
    detailFeedback.textContent = `Success! Rated ${currentRating}/5 for movie: ${movieTitle}`;

});

// ==========================================
// FLOATING MENU LOGIC
// ==========================================
const menuBtn = document.getElementById('menuBtn');
const floatingMenu = document.getElementById('floatingMenu');
const menuClose = document.getElementById('menuClose');

function setMenuOpen(open) {
    // We toggle the "menu-open" class on the body element(<body class="menu-open"> instead of <body>) 
    // which triggers the CSS to show or hide the menu and backdrop (body.menu-open .floating-menu { ... })
    document.body.classList.toggle("menu-open", open);
}

// Click on Hamburger icon
menuBtn.addEventListener('click', () => {
    const isOpen = document.body.classList.contains("menu-open"); // checks if the menu is currently open 
    setMenuOpen(!isOpen); // if it's open, we close it; if it's closed, we open it
});

// Click on the X button
menuClose.addEventListener('click', () => {
    setMenuOpen(false);
});

// Close if the user presses the Escape key on the keyboard
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        setMenuOpen(false);
    }
});

// Close if the user clicks on the blurred background
document.getElementById('screenBlur').addEventListener('click', () => {
    setMenuOpen(false);
});

// --- Modal Elements ---
const addMovieBtn = document.getElementById('addMovieBtn');
const addMovieModal = document.getElementById('addMovieModal');
const backdrop = document.getElementById('backdrop');
const cancelBtn = document.getElementById('cancelBtn');
const addMovieForm = document.getElementById('addMovieForm');

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');

    toastMessage.textContent = message;
    
    // Remove old classes and add the new type class (success or error)
    toast.classList.remove('success', 'error', 'show');
    toast.classList.add(type);
    
    // Small delay for the browser to apply the change
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Hide the message automatically after 3.5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

function closeModalSmoothly() {
    addMovieModal.classList.add('is-closing');
    backdrop.classList.add('is-closing');

    setTimeout(() => {
        addMovieModal.close();
        backdrop.hidden = true;
        addMovieModal.classList.remove('is-closing');
        backdrop.classList.remove('is-closing');
    }, 300); // 300ms matches the CSS transition duration for a smooth fade-out effect
}

// Open modal when clicking "Add a movie" button
addMovieBtn.addEventListener('click', () => {
    setMenuOpen(false); // Close the floating menu if it's open
    backdrop.hidden = false;
    addMovieModal.showModal();
});

// Close Modal (Cancel)
cancelBtn.addEventListener('click', () => {
    closeModalSmoothly();
});

// Submit Form (Save)
addMovieForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // prevents the default form submission behavior (which would cause a page reload)
    
    const title = document.getElementById('movieTitleInput').value; // user's text
    const genreSelect = document.getElementById('movieGenreSelect'); // multi select element for genres
    
    // gets selected genres in the format "Action|Comedy|Drama" which is expected by the backend
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

        // If successful, we optimistically add the new movie to our local list and re-render the movies grid
        const newMovie = {
            movieId: result.movieId,
            title: title,
            genres: selectedGenres
        };

        allMovies.unshift(newMovie); // add the new movie to the beginning of the allMovies array
        filteredMovies = [...allMovies];
        
        renderMovies();
        addMovieForm.reset(); // reset the form fields after successful submission
        
        closeModalSmoothly(); 

        showToast(`Movie "${title}" saved successfully!`, 'success');

    } catch (error) {
        console.error("Failed to save movie:", error);
        
        // In case of failure, the modal can remain open and display the error message
        showToast(`Could not save the movie. ${error.message}`, 'error');
    }
});

// Connect the "Get Recommendations" button
const recommendationsBtn = document.getElementById('recommendationsBtn');

recommendationsBtn.addEventListener('click', async () => {
    setMenuOpen(false); // Close the floating menu if it's open
    
    const savedRatings = JSON.parse(sessionStorage.getItem('movieRatings')) || {};
    
    // If there are no ratings, we show a message and don't call the backend
    if (Object.keys(savedRatings).length === 0) {
        showToast("Please rate some movies first!", "error");
        return;
    }

    // turns savedRatings from an object like { "1": 4.5, "2": 3.0 }
    //  to an array of objects like [ { movieId: 1, rating: 4.5 }, { movieId: 2, rating: 3.0 } ]
    // just like the backend expects it for the /recommendations endpoint
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
            
            // Change view only if there are recommendations
            document.getElementById('homeView').classList.add('hidden');
            document.getElementById('detailsView').classList.add('hidden');
            document.getElementById('recommendationsView').classList.remove('hidden');
            
        } else {
            // If list is empty, display a user-friendly message
            showToast("Help us get to know you better! Rate a few more movies and we’ll find your perfect picks.", "error");
        }
    } catch (error) {
        showToast("Failed to connect to the recommendation engine.", "error");
    }
});

// Close modal when clicking on the backdrop
backdrop.addEventListener('click', () => {
    closeModalSmoothly();
});
