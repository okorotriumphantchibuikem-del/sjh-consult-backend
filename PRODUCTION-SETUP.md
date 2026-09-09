# SJH Consult Production Setup

## Local development
1. Create the MySQL database `sjh_consult`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Fill in your own database, email, admin, JWT, and Paystack credentials.
4. In `backend/`, run `npm install` and then `npm start`.
5. Serve the project root with VS Code Live Server on port 5500.
6. Open `http://127.0.0.1:5500/`.

## Production
Set:
- `NODE_ENV=production`
- `FRONTEND_URL=https://your-real-domain.com`
- `API_URL=https://api.your-real-domain.com`
- a strong random `JWT_SECRET` of at least 32 characters
- real SMTP credentials
- a strong admin password
- `PAYSTACK_SECRET_KEY` using the appropriate live/test key
- production MySQL credentials

The API only accepts browser CORS requests from the configured frontend URL (plus the two local development origins). Authentication cookies become `Secure` automatically when `NODE_ENV=production`.

Never commit `backend/.env` to GitHub or share it in a ZIP.
