# SJH Consult — Connected User Dashboard

This build connects the applicant/user side to the Node.js + Express + MySQL backend.

## Start the backend

1. Open a terminal in `backend`.
2. Make sure your existing `.env` contains your real local database, JWT, email and Paystack settings.
3. Run `npm install` if dependencies are not already installed.
4. Run `npm start`.
5. Confirm `http://localhost:3000/api/health` reports that the backend and database are connected.

The backend automatically creates the user-dashboard support tables on startup. Existing user records are preserved.

## Start the frontend

Open the project with VS Code Live Server and use the frontend URL configured in `.env` (normally `http://127.0.0.1:5500`).

## Connected user features

- Secure login/session and logout
- Artisan and Corporate accounts use the same connected dashboard
- Live profile data and profile editing
- Education, skills, career field, target job and career interests
- Profile completion tracking
- Live job listings from MySQL
- Job details, save job and apply
- Duplicate-application protection
- Application history and withdrawal for eligible applications
- Training courses and real enrollment records
- Appointment requests and live appointment status
- CV upload (PDF/DOC/DOCX, max 5MB) and review history
- User notifications with read-all and delete controls
- Support messages and admin replies
- Payment history and Paystack initialization/verification
- Saved opportunities
- Certificates loaded from the database
- Password change
- Account deactivation
- User-facing service requests and reviews API
- Admin status changes create user notifications

## Important

Do not copy a real `backend/.env` into a public repository. The ZIP intentionally excludes the real `.env`; use `backend/.env.example` as the safe template.


## Application decision workflow
Admins can set application status to Pending, Under Review, Shortlisted, Interview, Accepted, Rejected, or Withdrawn. Admin notes are delivered to the applicant in their dashboard notifications. Application status history is stored in `application_status_history`. Users can open My Applications to see the current decision and SJH note.
