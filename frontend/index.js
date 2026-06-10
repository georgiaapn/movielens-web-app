// ==========================================
// MODEL
// ==========================================

const Model = {
    config: {
        apiBaseUrl: "http://127.0.0.1:3000/movielens/api",
        moviesPerPage: 12
    },

    state: {
        currentPage: 1,
        allMovies: [],
        filteredMovies: [],
        recommendedMovies: [],
        recommendationCards: [],
        activeRecIndex: 0,
        currentSelectedMovieId: null,
        currentRating: 0
    },

    getSavedRatings() {
        return JSON.parse(sessionStorage.getItem('movieRatings')) || {};
    },

    saveRatingForSession(movieId, rating) {
        const savedRatings = this.getSavedRatings(); // Get the current session's saved ratings from sessionStorage
        savedRatings[movieId] = rating; // Update the rating for the current movie
        sessionStorage.setItem('movieRatings', JSON.stringify(savedRatings)); // Save the updated ratings back to sessionStorage
    },

    // turns savedRatings from an object like { "1": 4.5, "2": 3.0 }
    //  to an array of objects like [ { movieId: 1, rating: 4.5 }, { movieId: 2, rating: 3.0 } ]
    // just like the backend expects it for the /recommendations endpoint
    buildRatingsArray(savedRatings) {
        return Object.entries(savedRatings).map(([id, rating]) => ({
            movieId: parseInt(id, 10),
            rating: rating
        }));
    },

    setMovies(movies) {
        this.state.allMovies = movies;
        this.state.filteredMovies = [...movies]; // new array reference, with the same content as allMovies
        this.state.currentPage = 1; // reset to first page on new search
    },

    addMovie(movie) {
        this.state.allMovies.unshift(movie); // add the new movie to the beginning of the allMovies array
        this.state.filteredMovies = [...this.state.allMovies]; // update filteredMovies to include the new movie
    },

    setRecommendations(recommendations) {
        this.state.recommendedMovies = recommendations;
        this.state.activeRecIndex = 0; // reset active carousel item to the first recommendation
        this.state.recommendationCards = []; // clear old prepared card data before rebuilding the carousel
    },

    setRecommendationCards(cards) {
        this.state.recommendationCards = cards; // store the ready recommendation card objects used by the carousel view
    },

    // This function tries to find the movie in allMovies first, and if not found, it looks in recommendedMovies.
    // returns the movie object if found which is in the format { movieId, title, genres }, or null if not found in either list.
    getMovieById(movieId) {
        return this.state.allMovies.find((movie) => movie.movieId === movieId)
            || this.state.recommendedMovies.find((movie) => movie.movieId === movieId)
            || null;
    },

    getCurrentPageMovies() {
        // Getting current page movies based on pagination logic
        // for example, if currentPage = 1 -> movies 0 to 11
        const startIndex = (this.state.currentPage - 1) * this.config.moviesPerPage;
        // slice() creates the subset of movies to render based on the current page and MOVIES_PER_PAGE
        return this.state.filteredMovies.slice(startIndex, startIndex + this.config.moviesPerPage);
    },

    getTotalPages() {
        return Math.ceil(this.state.filteredMovies.length / this.config.moviesPerPage); // calculates total pages
    },

    setCurrentPage(page) {
        this.state.currentPage = page; // update the currently selected pagination page
    },

    setCurrentSelectedMovieId(movieId) {
        this.state.currentSelectedMovieId = movieId; // remember which movie is currently open in the details view
    },

    setCurrentRating(rating) {
        this.state.currentRating = rating; // store the rating currently selected by the user in the details view
    },

    getCurrentRating() {
        return this.state.currentRating;
    },

    setActiveRecIndex(index) {
        this.state.activeRecIndex = index; // keep track of which recommendation card is currently active
    },

    // fetch movies based on search query API Call
    async fetchMovies(query = "") {
        const response = await fetch(`${this.config.apiBaseUrl}/movies?search=${encodeURIComponent(query)}`);
        // encodeURIComponent: makes user's search text safe for URL encoding
        const data = await response.json();
        return data.movies || [];
    },

    // get ratings API call
    async fetchAverageRating(movieId) {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/ratings/${movieId}`);
            const data = await response.json();

            if (data.status === "success" && data.ratings.length > 0) {
                let sum = 0;
                for (const curr of data.ratings) {
                    sum += curr.rating;
                }
                return (sum / data.ratings.length).toFixed(1);
            }

            return "N/A";
        } catch (error) {
            console.error(`Error fetching ratings for movie ${movieId}:`, error);
            return "Error";
        }
    },

    // add movie API call
    async createMovie(title, genres) {
        const response = await fetch(`${this.config.apiBaseUrl}/movies`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, genres })
        });

        const result = await response.json();

        if (!response.ok || result.status === "fail" || result.detail?.status === "fail") {
            throw new Error(
                result.message ||
                result.detail?.message ||
                `Server error: ${response.status}`
            );
        }

        return {
            movieId: result.movieId,
            title,
            genres
        };
    },

    // recommendation API call
    async fetchRecommendations(ratingsArray) {
        const response = await fetch(`${this.config.apiBaseUrl}/recommendations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ratings: ratingsArray })
        });

        const data = await response.json();
        return data; // returns the backend response that contains the personalized recommendations
    },

    splitTitleAndYear(title) {
        // For example, if the title is "The Matrix (1999)", it will separate "The Matrix" and "(1999)"
        // match[0] = full title, match[1] = title without year, match[2] = year in parentheses (if exists)
        const match = title.match(/(.+?)\s*(\(\d{4}\))?$/);
        return {
            titleOnly: match ? match[1] : title,
            yearOnly: (match && match[2]) ? match[2] : ""
        };
    },

    // Genre Formatting (from Action|Comedy to ACTION • COMEDY)
    formatGenres(genres) {
        return genres ? genres.split('|').join(' • ') : "UNKNOWN";
    },

    normalizeRatingValue(avgRating) {
        return (avgRating === "N/A" || avgRating === "Error") ? 0 : avgRating; // if avgRating is "N/A" or "Error", we treat it as 0 for the star display
    }
};

// ==========================================
// VIEW
// ==========================================

const View = {
    elements: {
        homeView: document.getElementById('homeView'),
        detailsView: document.getElementById('detailsView'),
        recommendationsView: document.getElementById('recommendationsView'),
        moviesGrid: document.getElementById('moviesGrid'),
        pagination: document.getElementById('pagination'),
        recommendationCarousel: document.getElementById('recommendationCarousel'),
        searchInput: document.getElementById('searchInput'),

        detailTitle: document.getElementById('detailTitle'),
        detailYear: document.getElementById('detailYear'),
        detailGenres: document.getElementById('detailGenres'),
        detailRateBtn: document.getElementById('detailRateBtn'),
        detailFeedback: document.getElementById('detailFeedback'),
        detailStars: document.querySelectorAll('.details-star'),
        detailRatingStars: document.getElementById('detailRatingStars'),

        menuBtn: document.getElementById('menuBtn'),
        floatingMenu: document.getElementById('floatingMenu'),
        menuClose: document.getElementById('menuClose'),
        screenBlur: document.getElementById('screenBlur'),

        addMovieBtn: document.getElementById('addMovieBtn'),
        recommendationsBtn: document.getElementById('recommendationsBtn'),
        addMovieModal: document.getElementById('addMovieModal'),
        backdrop: document.getElementById('backdrop'),
        cancelBtn: document.getElementById('cancelBtn'),
        addMovieForm: document.getElementById('addMovieForm'),

        toast: document.getElementById('toast'),
        toastMessage: document.getElementById('toastMessage')
    },

    createStarRating(rating) {
        let stars = '';
        const numRating = parseFloat(rating); // Convert to number in case it's a string
        const fullStars = Math.floor(numRating); // Number of fully filled stars
        const hasHalfStar = (numRating % 1) === 0.5; // boolean variable to check if the decimal part is 0.5

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
    },

    // viewName should be one of 'homeView', 'detailsView', 'recommendationsView'
    showView(viewName) {
        this.elements.homeView.classList.add('hidden');
        this.elements.detailsView.classList.add('hidden');
        this.elements.recommendationsView.classList.add('hidden');
        this.elements[viewName].classList.remove('hidden'); // show only the requested main view
    },

    renderMovieDetails({ titleOnly, yearOnly, formattedGenres }) {
        this.elements.detailTitle.textContent = titleOnly;
        this.elements.detailYear.textContent = yearOnly;
        this.elements.detailGenres.textContent = formattedGenres; // fills the details placeholders with the selected movie information
    },

    renderMoviesSkeleton(movies) {
        this.elements.moviesGrid.innerHTML = '';

        // for each movie, we create a card and append it to the movieGrid
        movies.forEach((movie) => {
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.style.cursor = 'pointer'; // make it clear that the card is clickable
            movieCard.onclick = () => window.showMovieDetails(movie.movieId); //  click event to open details view

            // Fill the inside of the card with the movie title and a placeholder for the rating
            // (which will be updated after fetching)
            movieCard.innerHTML = `
                <div class="movie-name">${movie.title}</div>
                <div class="movie-info">
                    <div class="stars" id="stars-${movie.movieId}">
                        ${this.createStarRating(0)}
                    </div>
                    <span class="rating-count" id="rating-${movie.movieId}">...</span>
                </div>
            `;

            this.elements.moviesGrid.appendChild(movieCard);
        });
    },

    updateMovieCardRating(movieId, avgRating, ratingValue) {
        // Update rating text
        // getElementById: finds the element with id rating-{movieId} and updates its text content to the average rating
        const ratingElement = document.getElementById(`rating-${movieId}`);
        if (ratingElement) {
            ratingElement.textContent = avgRating;
        }

        // Update star ratings
        // getElementById: finds the element with id stars-{movieId} and updates its inner HTML to the new star rating
        const starsElement = document.getElementById(`stars-${movieId}`);
        if (starsElement) {
            starsElement.innerHTML = this.createStarRating(ratingValue);
        }
    },

    renderPagination(totalPages, currentPage) {
        if (totalPages <= 1) {
            this.elements.pagination.innerHTML = "";
            return;
        }

        // previous page button. If we are on the first page, it is disabled
        let html = `
            <button class="pagination-btn" onclick="changePage(-1)" ${currentPage === 1 ? 'disabled' : ''}>
                ❮
            </button>
        `;

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
            } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
                // Add ellipsis (...) if there's a large gap between pages
                html += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        // next page button. If we are on the last page, it is disabled
        html += `
            <button class="pagination-btn" onclick="changePage(1)" ${currentPage === totalPages ? 'disabled' : ''}>
                ❯
            </button>
        `;

        this.elements.pagination.innerHTML = html;
    },

    updateStarsUI(ratingToDisplay) {
        // star is the DOM element for each star, index is its position (0 to 4)
        this.elements.detailStars.forEach((star, index) => {
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
    },

    renderRecommendationCarousel(cards, activeRecIndex) {
        // cards = array of objexts = movies that will be displayed in the carousel,
        // each object has { movieId, title, avgRating, ratingValue }
        // .map() creates an HTML string for each card, and .join('') combines them into one big HTML string
        // that is set as the innerHTML of the carousel container
        this.elements.recommendationCarousel.innerHTML = cards.map((card, index) => `
            <li class="carousel-item movie-card ${index === activeRecIndex ? 'active' : ''}" id="rec-item-${index}"
                onclick="showMovieDetails(${card.movieId})">
                <div class="movie-name">${card.title}</div>
                <div class="movie-info">
                    <div class="stars">${this.createStarRating(card.ratingValue)}</div>
                    <span class="rating-count">${card.avgRating}</span>
                </div>
            </li>
        `).join('');
    },

    refreshRecommendationActiveState(activeRecIndex) {
        const items = this.elements.recommendationCarousel.querySelectorAll('.carousel-item'); // selects all carousel cards
        items.forEach((item, index) => {
            if (index === activeRecIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    scrollToActiveRecommendation() {
        const activeItem = document.querySelector(".carousel-item.active"); // finds the currently active recommendation card in the carousel
        if (activeItem) {
            activeItem.scrollIntoView({ // scrolls the active card into the center of the carousel container (browser function)
                behavior: "smooth",
                block: "nearest",
                inline: "center"
            });
        }
    },

    // We toggle the "menu-open" class on the body element(<body class="menu-open"> instead of <body>) 
    // which triggers the CSS to show or hide the menu and backdrop (body.menu-open .floating-menu { ... })
    setMenuOpen(open) {
        document.body.classList.toggle("menu-open", open);
    },

    showToast(message, type = 'success') {
        this.elements.toastMessage.textContent = message;
        // Remove old classes and add the new type class (success or error)
        this.elements.toast.classList.remove('success', 'error', 'show');
        this.elements.toast.classList.add(type);

        // Small delay for the browser to apply the change
        setTimeout(() => {
            this.elements.toast.classList.add('show');
        }, 10);

         // Hide the message automatically after 3.5 seconds
        setTimeout(() => {
            this.elements.toast.classList.remove('show');
        }, 3500);
    },

    closeModalSmoothly() {
        this.elements.addMovieModal.classList.add('is-closing');
        this.elements.backdrop.classList.add('is-closing');

        setTimeout(() => {
            this.elements.addMovieModal.close();
            this.elements.backdrop.hidden = true;
            this.elements.addMovieModal.classList.remove('is-closing');
            this.elements.backdrop.classList.remove('is-closing');
        }, 300); // 300ms matches the CSS transition duration for a smooth fade-out effect
    },

    openAddMovieModal() {
        this.elements.backdrop.hidden = false;
        this.elements.addMovieModal.showModal();
    },

    resetAddMovieForm() {
        this.elements.addMovieForm.reset(); // reset the form fields in add a movie modal after successful submission
    },

    showMoviesFetchError() {
        this.elements.moviesGrid.innerHTML =
            '<p style="color: white; padding: 20px;">Failed to connect to Backend. Please ensure that the uvicorn server is running.</p>';
    },

    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Smooth scroll to top when changing pages or views
    },

    clearRecommendationsCarousel() {
        this.elements.recommendationCarousel.innerHTML = ''; // removes previous recommendation cards before rendering new ones
    }
};

// ==========================================
// CONTROLLER
// ==========================================

const Controller = {
    async loadMovies(query = "") {
        try {
            const movies = await Model.fetchMovies(query);
            Model.setMovies(movies);
            this.renderMoviesPage(); // render the first page of the newly fetched movies
        } catch (error) {
            console.error("Error fetching movies:", error);
            View.showMoviesFetchError();
        }
    },

    async renderMoviesPage() {
        const movies = Model.getCurrentPageMovies();
        View.renderMoviesSkeleton(movies);
        View.renderPagination(Model.getTotalPages(), Model.state.currentPage);

        for (const movie of movies) {
            const avgRating = await Model.fetchAverageRating(movie.movieId);
            const ratingValue = Model.normalizeRatingValue(avgRating); // convert "N/A"/"Error" to 0 so star rendering still works
            View.updateMovieCardRating(movie.movieId, avgRating, ratingValue);
        }
    },

    async openMovieDetails(movieId) {
        const movie = Model.getMovieById(movieId);
        if (!movie) return;

        Model.setCurrentSelectedMovieId(movieId);

        const savedRatings = Model.getSavedRatings();
        const savedRating = savedRatings[movieId] || 0; // restore previously saved session rating for this movie if it exists
        Model.setCurrentRating(savedRating);

        if (savedRating) {
            View.elements.detailFeedback.textContent = `You previously rated this ${savedRating}/5.`;
        } else {
            View.elements.detailFeedback.textContent = "Select a rating to continue.";
        }

        View.updateStarsUI(Model.getCurrentRating());
        View.renderMovieDetails({
            ...Model.splitTitleAndYear(movie.title),
            formattedGenres: Model.formatGenres(movie.genres)
        });
        View.showView('detailsView');
        View.scrollToTop(); // Smooth scroll to top when opening details
    },

    returnToHome() {
        View.showView('homeView');
        View.scrollToTop(); // Smooth scroll to top when returning home
    },

    // This function is called when the user hovers over the stars in the details view to give them
    //  a preview of what their rating would look like before they click to select it. 
    // It updates the star UI based on the rating value calculated from the mouse position.
    previewDetailRating(rating) {
        View.updateStarsUI(rating);
    },

    selectDetailRating(rating) {
        Model.setCurrentRating(rating);
        View.updateStarsUI(rating);
        View.elements.detailFeedback.textContent = `You selected ${rating} stars. Ready to rate!`; // feedback shown immediately after the user clicks a star
    },

    // This function is called when the user's mouse leaves the star area in the details view, to reset the star 
    // display back to their currently selected rating (or 0 if they haven't selected one yet).
    resetDetailRatingPreview() {
        View.updateStarsUI(Model.getCurrentRating());
    },

    // This function is called when the user clicks the "Rate" button in the details view. It checks if they have 
    // selected a rating, saves it to sessionStorage, and updates the feedback message to confirm their rating.
    submitDetailRating() {
        if (Model.getCurrentRating() === 0) {
            View.elements.detailFeedback.textContent = "Please select a rating first.";
            return;
        }

        Model.saveRatingForSession(Model.state.currentSelectedMovieId, Model.getCurrentRating());
        const movieTitle = View.elements.detailTitle.textContent;
        View.elements.detailFeedback.textContent = `Success! Rated ${Model.getCurrentRating()}/5 for movie: ${movieTitle}`;
    },

    // This function is called when the user clicks the "Get Recommendations" button in the menu. 
    async openRecommendations() {
        View.setMenuOpen(false); // close the menu when opening recommendations

        // It checks if the user has rated any movies
        const savedRatings = Model.getSavedRatings();
        if (Object.keys(savedRatings).length === 0) { // If not, it prompts the user to rate more movies.
            View.showToast("Please rate some movies first!", "error");
            return;
        }

        // If yes, it sends those ratings to the backend to get personalized recommendations.
        //  If recommendations are returned, it renders them in a carousel and shows the recommendations view. 
        const ratingsArray = Model.buildRatingsArray(savedRatings);

        try {
            const data = await Model.fetchRecommendations(ratingsArray);

            if (data.status === "success" && data.recommendations && data.recommendations.length > 0) {
                Model.setRecommendations(data.recommendations);
                await this.renderRecommendations();
                View.showView('recommendationsView');
            } else {
                View.showToast("Help us get to know you better! Rate a few more movies and we’ll find your perfect picks.", "error");
            }
        } catch (error) {
            View.showToast("Failed to connect to the recommendation engine.", "error");
        }
    },

    // This function is responsible for rendering the recommendation carousel. It takes the list of recommended movies, 
    // fetches their average ratings, and creates card objects that contain the movie ID, title, average rating, and a normalized rating value 
    // for star display.
    async renderRecommendations() {
        const cards = [];

        for (const movie of Model.state.recommendedMovies) {
            const avgRating = await Model.fetchAverageRating(movie.movieId);
            cards.push({
                movieId: movie.movieId,
                title: movie.title,
                avgRating,
                ratingValue: Model.normalizeRatingValue(avgRating)
            });
        }

        Model.setRecommendationCards(cards);
        View.renderRecommendationCarousel(cards, Model.state.activeRecIndex);
        // requestAnimationFrame tells the browser to perform the function right before the next repaint
        requestAnimationFrame(() => View.scrollToActiveRecommendation()); // scroll happens after the DOM has updated with the new active class
    },

    moveCarousel(step) {
        if (Model.state.recommendedMovies.length === 0) return;

        // The next index is calculated using modulo to wrap around the list of recommendations.
        const nextIndex = (
            Model.state.activeRecIndex + step + Model.state.recommendedMovies.length
        ) % Model.state.recommendedMovies.length;

        Model.setActiveRecIndex(nextIndex);
        View.refreshRecommendationActiveState(Model.state.activeRecIndex); // Redesign to change active card (triggers CSS transition)
        // requestAnimationFrame tells the browser to perform the function right before the next repaint
        requestAnimationFrame(() => View.scrollToActiveRecommendation()); // scroll happens after the DOM has updated with the new active class
    },

    goToPage(page) {
        Model.setCurrentPage(page);
        this.renderMoviesPage();
        View.scrollToTop(); // Smooth scroll to top when changing pages
    },

    changePage(step) {
        this.goToPage(Model.state.currentPage + step); // used by previous/next pagination buttons
    },

    openAddMovieModal() {
        View.setMenuOpen(false); // Close the floating menu if it's open
        View.openAddMovieModal();
    },

    closeAddMovieModal() {
        View.closeModalSmoothly(); // close the dialog with the fade-out transition
    },

    // This function is called when the user submits the "Add Movie" form. 
    async submitAddMovieForm(e) {
        e.preventDefault(); // prevents the default form submission behavior (which would cause a page reload)

        const title = document.getElementById('movieTitleInput').value; // user's text
        const genreSelect = document.getElementById('movieGenreSelect'); // multi select element for genres
        const selectedGenres = Array.from(genreSelect.selectedOptions)  // gets selected genres in the format "Action|Comedy|Drama" which is expected by the backend
            .map((option) => option.value)
            .join('|');

        try {
            const newMovie = await Model.createMovie(title, selectedGenres);
            Model.addMovie(newMovie);
            this.renderMoviesPage();
            View.resetAddMovieForm();
            View.closeModalSmoothly();
            View.showToast(`Movie "${title}" saved successfully!`, 'success');
        } catch (error) {
            console.error("Failed to save movie:", error);
            View.showToast(`Could not save the movie. ${error.message}`, 'error');
        }
    },

    bindSearchInput() {
        let timeout = null;

        // every time search input changes (user types, deletes etc.)
        View.elements.searchInput.addEventListener('input', (e) => {
            // Debounce: we wait before making the API call
            clearTimeout(timeout); // if the user types again before 300ms, we reset the timer and wait again
            // start a 300ms timer
            // if it completes without interruption, we call fetchMovies with the current value of the search input
            timeout = setTimeout(() => {
                this.loadMovies(e.target.value); // e is the event object, e.target is the input element, e.target.value is the current text in the search box
            }, 300);
        });
    },

    bindDetailStars() {
        View.elements.detailStars.forEach((star, index) => {
            // if cursor offset is less than half the star's width => 
            // mouse is in the left half of the star => 
            // it's a half star
            const calculateRating = (e) => {
                const isHalf = e.offsetX < e.target.offsetWidth / 2;
                return index + (isHalf ? 0.5 : 1);
            };

            // event listener for hover
            // while mouse is moving over a star, calculate the rating based on the mouse position and update the UI 
            // to show the potential rating
            star.addEventListener('mousemove', (e) => {
                this.previewDetailRating(calculateRating(e));
            });

            // event listener for click
            star.addEventListener('click', (e) => {
                this.selectDetailRating(calculateRating(e));
            });
        });

        // when the mouse leaves the star container, we want to reset the stars
        if (View.elements.detailRatingStars) {
            View.elements.detailRatingStars.addEventListener('mouseleave', () => {
                this.resetDetailRatingPreview();
            });
        }
    },

    bindMenu() {
        // Click on Hamburger icon
        View.elements.menuBtn.addEventListener('click', () => {
            const isOpen = document.body.classList.contains("menu-open");
            View.setMenuOpen(!isOpen);
        });

        // Click on the X button
        View.elements.menuClose.addEventListener('click', () => {
            View.setMenuOpen(false);
        });

        // Close if the user clicks on the blurred background
        View.elements.screenBlur.addEventListener('click', () => {
            View.setMenuOpen(false);
        });

        // Close if the user presses the Escape key on the keyboard
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                View.setMenuOpen(false);
            }
        });
    },

    bindEvents() {
        View.elements.detailRateBtn.addEventListener('click', () => this.submitDetailRating());
        View.elements.addMovieBtn.addEventListener('click', () => this.openAddMovieModal()); // Open modal when clicking "Add a movie" button
        View.elements.cancelBtn.addEventListener('click', () => this.closeAddMovieModal()); // Close Modal (Cancel)
        View.elements.addMovieForm.addEventListener('submit', (e) => this.submitAddMovieForm(e));
        View.elements.recommendationsBtn.addEventListener('click', () => this.openRecommendations()); // Connect the "Get Recommendations" button
        View.elements.backdrop.addEventListener('click', () => this.closeAddMovieModal()); // Close modal when clicking on the backdrop

        this.bindSearchInput();
        this.bindDetailStars();
        this.bindMenu();
    },

    init() {
        this.loadMovies(); // Initial load from the database
        this.bindEvents();
    }
};

// ==========================================
// GLOBAL HTML HOOKS
// ==========================================

window.showMovieDetails = (movieId) => Controller.openMovieDetails(movieId); // allows inline onclick in HTML to open the details view
window.returnToHome = () => Controller.returnToHome(); // allows the logo/back button HTML hooks to return to the home view
window.goToPage = (page) => Controller.goToPage(page); // allows numbered pagination buttons in HTML to navigate directly
window.changePage = (step) => Controller.changePage(step); // allows previous/next pagination buttons in HTML to navigate relatively
window.moveCarousel = (step) => Controller.moveCarousel(step); // allows carousel arrow buttons in HTML to move recommendations left/right

document.addEventListener('DOMContentLoaded', () => Controller.init()); // defines initialization logic that runs when the DOM content (HTML) is fully loaded
