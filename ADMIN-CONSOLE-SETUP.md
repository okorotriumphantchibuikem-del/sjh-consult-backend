# SJH Consult Admin Console

The admin console is now connected to the Node/Express backend and MySQL database.

## 1. Configure the first admin

Open `backend/.env` and replace these values:

```env
ADMIN_NAME=SJH Super Administrator
ADMIN_EMAIL=your-real-admin-email@example.com
ADMIN_PASSWORD=your-strong-admin-password
```

Use a strong password of at least 8 characters. Do not paste the password into chat or commit `.env` to a public repository.

On the first backend start, the server creates the `admins` table and creates the initial admin if that email does not already exist.

## 2. Start the backend

From the `backend` folder:

```bash
npm install
npm start
```

You should see:

```text
Authentication and admin tables are ready.
SJH Consult backend running on port 3000
```

## 3. Open the admin console

Run the frontend with VS Code Live Server and open:

`admin/admin-login.html`

Sign in with the admin credentials configured in `.env`.

## 4. What the admin can control

- Dashboard statistics
- Users: create, edit, suspend/activate, verify, delete
- Jobs: create, edit, publish, close, archive, delete
- Applications: review and change status
- Training courses: create, edit, archive, delete
- Services: create, edit, archive, delete
- Payments: view finance records
- Reviews: publish, hide, delete
- Messages: read, reply, close
- Notifications: create and delete
- Site settings: website name, contact details, maintenance mode
- Admin password change
- Security audit log

## 5. Important security change

The old admin login only stored an email in `localStorage`. It has been replaced with a real backend login using a bcrypt password hash, JWT cookie authentication, and protected `/api/admin/*` routes.

Do not restore the old fake admin login script.

## 6. Database

The backend automatically creates the admin/control tables when it starts. Existing `users` data is preserved.

The public jobs page also attempts to load active jobs from `/api/public/jobs`, so jobs created or published in the admin console can become visible on the website.
