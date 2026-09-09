# SJH Consult End-to-End Audit

This release is based on the previous Professional Requests package and includes a final integration pass.

## Verified
- Node.js syntax checked across backend and key frontend scripts.
- User authentication uses the HTTP-only `sjh_token` session and protected dashboard routes.
- Registration, email verification, login, logout, password reset and profile update routes remain connected.
- Job listings load from the backend; applications persist to MySQL and support status history and withdrawal.
- Training enrollment for paid courses is payment-gated through Paystack; successful verification activates enrollment.
- User appointments persist to MySQL instead of browser-only localStorage.
- Public professional-worker requests persist to MySQL and appear in the admin console.
- Public contact messages now persist to the existing messages table and appear in the admin Messages area.
- Admin management routes cover users, jobs, applications, professional requests, courses, appointments, services, payments, reviews, messages, notifications, settings, admins and audit logs.
- Generic payment checkout no longer accepts a client-supplied amount; the backend validates the selected service price.
- SJH CSS contains no CSS custom-property (`--name`) declarations.

## Required production configuration
1. Create `backend/.env` from `.env.example`.
2. Set a strong `JWT_SECRET` (32+ characters).
3. Set MySQL credentials/database.
4. Set SMTP credentials for verification/reset emails.
5. Set `PAYSTACK_SECRET_KEY` before accepting paid payments.
6. Set `FRONTEND_URL` to the real production site.

The production source package excludes `backend/.env` and `backend/node_modules`; use `backend/.env.example` for configuration.
