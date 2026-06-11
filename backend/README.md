# Backend README

## How to Run

After extracting the zip file, open a terminal in the project root folder.

## 1. Install Dependencies

Install the backend dependencies with:

```powershell
python -m pip install -r backend\requirements.txt
```

If `pip` does not point to the correct Python installation, use `python -m pip` as shown above.

## 2. Prepare the Database

The repository already includes the SQLite database file `backend\movielens.db`.

You can use it directly without any extra setup.

If you want to recreate the database from the CSV files in `backend\data\`, run:

```powershell
python -m backend.init_db
```

## 3. Start the Backend

Start the backend with:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 3000 --reload
```

If `python -m uvicorn` does not work, you can also run:

```powershell
uvicorn backend.main:app --host 127.0.0.1 --port 3000 --reload
```

## 4. Backend Address

After the server starts, the backend will be available at:

```text
http://127.0.0.1:3000
```
