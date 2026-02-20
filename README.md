# Lost & Found – Topilmalar idorasi

Simple MVP web application for lost/found announcements (also suitable for Telegram Mini App usage).

## Stack
- Backend: FastAPI
- Frontend: HTML + CSS + Vanilla JavaScript
- Database: SQLite (`lost_found.db`)

## Features
- Create announcement (lost/found)
- Public list of approved announcements with filters (region/type)
- My announcements page (by `telegram_id`)
- Admin panel:
  - View pending announcements
  - Approve/delete announcements
  - Add categories
- No login/password (user identified by Telegram `telegram_id`)

## Database tables
- `users(id, telegram_id, full_name)`
- `categories(id, name)`
- `items(id, title, description, category_id, region, type, contact, status, user_id, created_at)`

## Run locally
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. (Optional) set admin Telegram ID:
   ```bash
   export ADMIN_TELEGRAM_ID=123456789
   ```
3. Start server:
   ```bash
   uvicorn main:app --reload
   ```
4. Open app:
   - Home: `http://127.0.0.1:8000/`
   - Create: `http://127.0.0.1:8000/create?telegram_id=111&full_name=Ali`
   - My page: `http://127.0.0.1:8000/my?telegram_id=111`
   - Admin: `http://127.0.0.1:8000/admin`

## API endpoints
- `POST /users`
- `GET /categories`
- `POST /items`
- `GET /items?region=...&type=lost|found`
- `GET /items/my?telegram_id=...`
- `GET /admin/pending?telegram_id=...`
- `POST /admin/approve/{item_id}?telegram_id=...`
- `DELETE /admin/delete/{item_id}?telegram_id=...`
- `POST /admin/categories?telegram_id=...`

## Notes
- New announcements are always created with `status = pending`.
- Only approved announcements appear on Home page.
- SQLite + SQLAlchemy ORM is used to prevent SQL injection risks.
