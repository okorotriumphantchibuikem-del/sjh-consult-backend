# SJH Consult Email Authentication Test

## 1. Backend setup

Open `backend/.env` and replace:

- `EMAIL_USER` with the Gmail address that will send SJH Consult emails.
- `EMAIL_PASS` with that Gmail account's Google App Password (not the normal Gmail password).
- `JWT_SECRET` with a long random secret.

Make sure MySQL is running and the `sjh_consult` database/users table exists.

## 2. Start the backend

Open Command Prompt in the `backend` folder:

```text
npm install
npm start
```

You should see the backend running on port 3000.

## 3. Start the website

From the project root, open the site with VS Code Live Server so it runs at:

`http://127.0.0.1:5500`

Do not open the registration page by double-clicking the HTML file.

## 4. Test registration

1. Open `auth/create-account.html` through Live Server.
2. Create a new Artisan or Corporate account using a real email address you can access.
3. The account should be created as unverified.
4. Check the email inbox and spam/junk folder.

## 5. Test verification

1. Open the `Verify My Email` button from the email on the same laptop.
2. SJH Consult should mark the account as verified.
3. The browser should end at `auth/verify-email.html?status=success`.
4. Log in using the same account.

## 6. Test the protection

Create another account and do not verify it. Try to log in.

Expected result:

`Please verify your email before logging in`

## 7. Test resend

On the login page, enter an unverified account's email and click `Resend verification`.
A new verification email should arrive with a new link.

## 8. Test reused links

After successfully verifying an email, open the same verification link again.
Expected result:

`Email Already Verified`

## 9. Test expired links

An expired token should send the user to the verification page with:

`Verification Link Expired`
