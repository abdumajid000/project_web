# Lost & Found – Topilmalar idorasi

Professional MVP web application for lost/found announcements (Telegram Mini App style support included).

## Stack
- Backend: FastAPI
- Frontend: HTML + CSS + Vanilla JavaScript
- Database: SQLite (`lost_found.db`)

## Main features
- Public approved announcements list with filters/search
- Create announcement (pending approval)
- My announcements page
- Admin panel from separate link (`/admin/login`)
- Category management

## New authentication flow (phone + Telegram code)
1. User opens `/auth`
2. Enters phone + telegram_id and requests code
3. Code is sent by Telegram bot (`TELEGRAM_BOT_TOKEN` required)
4. User verifies code and sets password once
5. Next logins use only phone + password
6. Telegram code is required again only for password reset

## Environment variables
- `ADMIN_PHONE` (admin phone, default: `+998900000000`)
- `TELEGRAM_BOT_TOKEN` (bot token for sending verification code)

## Database tables
- `users(id, telegram_id, full_name, phone, password_hash, is_admin)`
- `categories(id, name)`
- `items(id, title, description, category_id, region, type, contact, status, user_id, created_at)`
- `otp_codes(id, phone, code, purpose, expires_at, is_used)`
- `sessions(id, token, user_id, created_at)`

## Run locally
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Export env vars:
   ```bash
   export ADMIN_PHONE=+998901234567
   export TELEGRAM_BOT_TOKEN=123456:ABC...
   ```
3. Start server:
   ```bash
   uvicorn main:app --reload
   ```
4. Open pages:
   - Home: `http://127.0.0.1:8000/`
   - Auth: `http://127.0.0.1:8000/auth`
   - Create: `http://127.0.0.1:8000/create`
   - My: `http://127.0.0.1:8000/my`
   - Admin login: `http://127.0.0.1:8000/admin/login`
   - Admin panel: `http://127.0.0.1:8000/admin`

## API endpoints
### Auth
- `POST /auth/request-code`
- `POST /auth/verify-code`
- `POST /auth/set-password`
- `POST /auth/login`
- `POST /auth/forgot-password/request-code`
- `POST /auth/forgot-password/reset`
- `GET /auth/me`

### Core
- `POST /users`
- `GET /categories`
- `POST /items` (auth required)
- `GET /items`
- `GET /items/my` (auth required)
- `GET /admin/pending` (admin only)
- `POST /admin/approve/{item_id}` (admin only)
- `DELETE /admin/delete/{item_id}` (admin only)
- `POST /admin/categories` (admin only)
