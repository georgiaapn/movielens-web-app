# Web-Applications-Development-Assignment-2026
a web application that allows users to explore the MovieLens Latest Small dataset , add new movies, rate movies  and obtain personalized movie recommendations

## Run on Windows

Run all commands from the project root:

```powershell
cd C:\WebDev8th\Web-Applications-Development-Assignment-2026
```

### 1. Install backend dependencies

```powershell
pip install -r backend\requirements.txt
```

### 2. Start the backend

```powershell
uvicorn backend.main:app --host 127.0.0.1 --port 3000 --reload
```

Backend URL:
[http://127.0.0.1:3000](http://127.0.0.1:3000)

### 3. Start the frontend

Open a second PowerShell window in the same project root and run:

```powershell
python -m http.server 5500 --directory frontend
```

Frontend URL:
[http://127.0.0.1:5500](http://127.0.0.1:5500)

## Notes

- The backend must be running before the frontend can fetch movie data.
- If `pip` does not point to your Python 3 installation, use `python -m pip install -r backend\requirements.txt` instead.
