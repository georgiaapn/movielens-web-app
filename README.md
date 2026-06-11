# MovieLens Web App

A full-stack movie recommendation web application built with **FastAPI**, **SQLite**, and **vanilla JavaScript**.

The app allows users to browse the MovieLens Latest Small dataset, search for movies, add new titles, rate movies during the current browser session, and request personalized recommendations using a collaborative filtering algorithm.

## Features

- Search movies by title
- View movie ratings and average rating
- Add new movies to the dataset database
- Rate movies directly from the UI
- Get personalized recommendations
- Clean single-page frontend built with HTML, CSS, and vanilla JavaScript

## Tech Stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Python, FastAPI, Pydantic
- Database: SQLite
- Server: Uvicorn
- Dataset: MovieLens Latest Small

## Getting Started

### Prerequisites

- Python 3
- `pip`

### 1. Install dependencies

From the project root:

```powershell
python -m pip install -r backend\requirements.txt
```

### 2. Prepare the database

The repository already includes a ready-to-use SQLite database at `backend\movielens.db`.

If you want to recreate it from the CSV files, run:

```powershell
python -m backend.init_db
```

### 3. Run the backend

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 3000 --reload
```

Backend URL:
[http://127.0.0.1:3000](http://127.0.0.1:3000)

### 4. Run the frontend

In a second terminal, from the project root:

```powershell
python -m http.server 5500 --directory frontend
```

Frontend URL:
[http://127.0.0.1:5500/frontend/](http://127.0.0.1:5500/frontend)

## How It Works

- The frontend sends requests to the FastAPI backend.
- The backend reads movie and rating data from SQLite.
- User ratings are stored temporarily in browser `sessionStorage`.
- Recommendations are generated on demand using Pearson-correlation collaborative filtering.

## Project Structure

```text
frontend/
  index.html
  index.css
  index.js

backend/
  main.py
  models.py
  database.py
  init_db.py
  recommender.py
  requirements.txt
  movielens.db
  data/
```

## Notes

- The backend must be running before the frontend can fetch data.
- Frontend ratings are session-based and are not persisted to the database.
- The assignment-specific backend run instructions are also available in `backend/README.md`.
