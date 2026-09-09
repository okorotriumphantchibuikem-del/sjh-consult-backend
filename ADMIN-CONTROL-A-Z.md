# SJH Consult Admin Control A-Z

The admin console is a protected backend-driven control center. It uses MySQL for persistent data and a JWT HTTP-only cookie for administrator sessions.

## Modules

- Dashboard: live users, jobs, applications, messages and revenue statistics.
- Users: create, edit, verify/unverify, activate/suspend and delete accounts.
- Jobs: create, edit, publish/draft/close/archive and delete jobs.
- Applications: review applicants and update application status.
- Training: manage courses and enrollment counts.
- Appointments: create, edit, approve, reschedule, complete, cancel, reject and delete appointments.
- Services: manage public services and pricing/status.
- Payments: review transactions and update payment status.
- Reviews: publish, hide or delete reviews.
- Messages: read enquiries and save replies/status.
- Notifications: create and remove admin notifications.
- Settings: update public site settings and administrator password.
- Administrators: super-admin-only management of admin accounts.
- Audit Log: records important administrator actions.

## Startup

1. Copy your working `backend/.env` into the new `backend` folder.
2. Run `npm install` inside `backend`.
3. Run `npm start`.
4. Open `admin/admin-login.html` through Live Server.

The server creates missing admin-control tables automatically. Existing user data is preserved.

## Security notes

- Never put the administrator password in frontend JavaScript.
- Never commit the real `.env` file to a public repository.
- Super-admin privileges are required to manage other administrator accounts.
- The backend is authoritative; frontend controls are not treated as security boundaries.
