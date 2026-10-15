# Beginner's Next Steps: API, Database, GitHub, and Hosting

This guide starts where the local website currently is. Follow the steps in order:

1. Connect the Express API to MongoDB Atlas on your computer.
2. Sign in to `/admin` and add the real menu/categories.
3. Test reservations and data persistence.
4. Push the project to GitHub.
5. Host the API, website, and database.

The project has two apps: `client/` is the React website; `server/` is the Express API. The API stores data in MongoDB Atlas. Vercel or Netlify host the website, but the Express API also needs a Node.js web-service host, such as Render. The sample website can run without the API; admin edits and saved reservations cannot.

> **Important:** Never send anyone your `.env` files, database URI, administrator password/hash, or JWT secret. Do not commit them to GitHub.

## Part A — Run the API and database locally

### 1. Create a free MongoDB Atlas database

1. Sign up at MongoDB Atlas and create a project and cluster. Provider names and free-tier availability can change.
2. In **Database Access**, create a database user. Give it a strong, unique password and the minimum database privileges offered for your setup.
3. In **Network Access**, allow the IP address of your development computer. Do not choose `0.0.0.0/0` (allow access from anywhere) for a production database.
4. Open the cluster's **Connect** screen and select **Drivers**. Copy the connection URI. It looks similar to:

   ```text
   mongodb+srv://<db-user>:<db-password>@<cluster-host>/<database-name>?retryWrites=true&w=majority
   ```

5. Replace the username, password, and database name. If your database password contains characters such as `@`, `:`, `/`, `#`, or `%`, URL-encode those characters in the URI. Keep the completed URI private.

### 2. Create the server's private environment file

Open a new PowerShell window. The website can remain running in its existing terminal.

```powershell
cd "E:\Resturant Website project\server"
Copy-Item .env.example .env
code .env
```

If `code .env` does not work, open the `server` folder in your editor and open its `.env` file. Replace the example values with your own:

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://YOUR_DB_USER:YOUR_ENCODED_PASSWORD@YOUR_CLUSTER/YOUR_DATABASE?retryWrites=true&w=majority
JWT_SECRET=PASTE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
CLIENT_ORIGIN=http://localhost:5173
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD_HASH=PASTE_THE_BCRYPT_HASH_FROM_STEP_3
```

Do not put quotes around values. Keep `.env` in the `server` folder. The root `.gitignore` excludes it from Git.

### 3. Create your administrator password hash

Choose a strong administrator password and keep it private. In PowerShell, from the `server` folder, run this command after replacing the sample text with your chosen password:

```powershell
node -e "require('bcryptjs').hash('REPLACE_WITH_YOUR_OWN_PASSWORD', 12).then(console.log)"
```

Copy the printed hash (it starts with `$2`) into `ADMIN_PASSWORD_HASH` in `server/.env`. Do not put your plain password in the `.env` file. Sign-in uses the plain password you chose; the server compares it to the hash.

Generate a separate random JWT signing secret locally:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Paste the generated value into `JWT_SECRET`. It must be at least 32 characters. Never reuse the example text or publish this value.

Save `.env` and close it. Do not attach or paste it anywhere.

### 4. Start the API and verify Atlas connection

In the same `server` PowerShell window:

```powershell
npm install
npm run dev
```

Leave this terminal open. A successful startup says the API is listening on port 5000. Open a **third** PowerShell window and run:

```powershell
Invoke-RestMethod http://localhost:5000/api/health
```

Expected result:

```text
status database
------ --------
ok     connected
```

If it says `disconnected`, or the API process exits, read the error in the server terminal. Check the Atlas URI, database username/password, password encoding, and Atlas IP access list. Do not continue to admin until health says `connected`.

### 5. Connect the Vite website to the API

Open another PowerShell window:

```powershell
cd "E:\Resturant Website project\client"
Copy-Item .env.example .env
code .env
```

The local `client/.env` should contain:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

Save it. **Stop Vite** in the terminal where it is running by pressing `Ctrl+C`, then start it again:

```powershell
npm run dev
```

Vite reads environment variables at startup; restarting is required after editing `.env`. Open the local URL it prints (usually `http://localhost:5173`). The API terminal and Vite terminal must both stay open.

When the site loads, it fetches live menu, categories, and restaurant settings from the API. If the API cannot be reached, the site displays an API warning and uses sample menu data; that fallback does **not** mean database/admin features work.

### 6. Sign in and add database content

1. Visit `http://localhost:5173/admin`.
2. Enter the `ADMIN_EMAIL` value and the plain administrator password you chose in step 3.
3. Create categories first (for example, `From the fire`, `Small plates`, `The table`, `Something sweet`).
4. Add dishes with a valid name, description, category, numeric price in PKR, and public `https://` image URL. Mark availability and featured status. Use properly licensed images.
5. Refresh the public homepage. Your new database menu should appear instead of sample records.
6. Refresh `/admin` and sign in again if necessary. The admin token is kept only in memory, so refreshing signs you out. Check that menu data remains after signing in; this verifies persistence.
7. Try editing a dish, changing availability, and deleting a test dish/category. Avoid deleting real client data while testing.
8. Edit a restaurant setting, save, and return to the homepage. The public page should reflect the saved setting.

The API database starts empty. It does **not** automatically copy sample categories/dishes into Atlas. Do not worry if the first admin view has no database content; add categories and dishes in this step.

### 7. Test a saved reservation locally

1. On the homepage, submit the reservation form with a future date, valid phone number, guest count, and time.
2. Expected: a clear success confirmation appears.
3. Open `/admin` and sign in. The reservation should be listed there.
4. Use Confirm or Cancel and verify the status changes.

If the site shows an API error, confirm Atlas health is `connected`, both local servers are running, and the client `.env` has the right API URL. Open browser developer tools if necessary and inspect the failed request, but do not share screenshots containing private credentials.

### Local troubleshooting

- **“Missing required environment variables”**: check that `server/.env` exists, is saved, and contains all five required values: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `CLIENT_ORIGIN`. `PORT` is optional because the server defaults to 5000.
- **“ADMIN_PASSWORD_HASH must be a valid bcrypt hash”**: regenerate it with the `bcryptjs` command. It should start with `$2` and be approximately 60 characters.
- **“Could not start the API” / Atlas timeout**: recheck cluster state, network access, credentials, database URI, and URL-encoded password.
- **Port 5000 or 5173 already in use**: stop the old server with `Ctrl+C`. If Vite picks a different port, update `CLIENT_ORIGIN` in `server/.env` to the exact Vite origin, restart the API, and restart Vite.
- **Admin says API is not configured**: copy `client/.env.example` to `client/.env`, check the URL, and restart Vite.
- **CORS error**: `CLIENT_ORIGIN` must exactly match the browser address, including `http://` or `https://` and the port if local. Restart the API after changes.
- **Admin accepts credentials but changes fail**: inspect the API terminal; verify Atlas is connected and that you're signed in again after a page refresh.

## Part B — Check the project before publishing

Run these checks from PowerShell:

```powershell
cd "E:\Resturant Website project\client"
npm test
npm run lint
npm run build
cd ..\server
npm test
```

Each command should finish successfully. Fix failures before deploying. `npm run build` produces the static frontend in `client/dist`; you do not commit that generated folder.

## Part C — Push the project to GitHub

1. Create a **new empty repository** on GitHub. Do not initialize it with a README, license, or `.gitignore`.
2. Open PowerShell at the project root:

   ```powershell
   cd "E:\Resturant Website project"
   git init
   git status --short
   ```

3. Confirm that `server/.env` and `client/.env` are **not** listed. The `.env.example` files are safe because they contain placeholders. If either real `.env` is listed, stop before adding files and check the root `.gitignore`.
4. Stage and inspect the files:

   ```powershell
   git add .
   git status
   ```

   Read the list before committing. Make sure no passwords, tokens, or completed Atlas URI are included.

5. Commit and set the main branch:

   ```powershell
   git commit -m "Build Haden RestaurantOS"
   git branch -M main
   ```

6. Connect the empty repository. Replace the URL with the HTTPS URL shown by GitHub:

   ```powershell
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
   git push -u origin main
   ```

Git may open a browser for sign-in. Do not paste an access token into your code. For future changes, use `git status`, `git add .`, inspect `git status`, then `git commit -m "Describe change"` and `git push`.

If a secret ever reaches GitHub, assume it is exposed: rotate the database password/JWT secret immediately. Removing it in a later commit does not undo the exposure.

## Part D — Deploy the API (before the frontend)

Use a Node.js web-service host, such as Render. Dashboard labels and free-tier availability may change.

1. Create a web service connected to your GitHub repository.
2. Set **Root Directory** to `server`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `npm start`.
5. Add private environment variables in the host dashboard:

   ```text
   NODE_ENV=production
   MONGODB_URI=<your Atlas URI>
   JWT_SECRET=<a newly generated random secret, at least 32 characters>
   ADMIN_EMAIL=<your administrator email>
   ADMIN_PASSWORD_HASH=<your bcrypt hash>
   CLIENT_ORIGIN=http://localhost:5173
   ```

   Add `PORT` only if the host specifically tells you to set it. Reuse your admin email/hash if desired, but create a fresh strong JWT secret for production. Never add these values to GitHub or the Vercel/Netlify frontend settings.

6. Deploy the API. Visit `https://YOUR-API-HOST/api/health`. It must return `status: ok` and `database: connected`. If it does not, check the host logs and Atlas network access. For production, allow the API host's documented outbound IPs in Atlas; do not open the database to every IP.
7. Leave `CLIENT_ORIGIN` temporarily as local or set it to the final site origin after deploying the frontend. The API permits a comma-separated list of exact origins if you need both local and production access:

   ```text
   CLIENT_ORIGIN=http://localhost:5173,https://YOUR-SITE.example
   ```

   Do not add a path or trailing slash. Save the environment settings and redeploy/restart the API after edits.

## Part E — Deploy the frontend to Vercel

Use Vercel **or** Netlify for the frontend. Both use the same deployed API.

1. Import your GitHub repository into Vercel.
2. Set **Root Directory** to `client`.
3. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`. Install command: `npm install`.
4. Add this environment variable to the Production environment (and Preview if needed):

   ```text
   VITE_API_BASE_URL=https://YOUR-API-HOST/api
   ```

   This is the public API address, not a secret. Never set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, or any password in the frontend project.

5. Deploy. Open the assigned HTTPS URL. If direct refresh of `/admin` returns 404, create a `client/vercel.json` file:

   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/" }]
   }
   ```

   Commit and push this file, then redeploy. Confirm that `/admin` loads when opened directly.
6. Copy the final Vercel origin (for example `https://your-site.vercel.app`) into the API host's `CLIENT_ORIGIN`. Restart/redeploy the API.
7. Test the homepage, admin sign-in, and a saved reservation on the deployed site.

## Alternative: deploy the frontend to Netlify

Choose this instead of Part E if you want Netlify for the frontend.

1. Import the repository into Netlify.
2. Set **Base directory** to `client`; **Build command** to `npm run build`; **Publish directory** to `dist` (relative to the base directory).
3. Add the environment variable `VITE_API_BASE_URL` with value `https://YOUR-API-HOST/api`.
4. Add an SPA fallback file at `client/public/_redirects` with exactly:

   ```text
   /* /index.html 200
   ```

   Commit and push the file. Netlify then serves the React app for direct routes such as `/admin`.
5. Deploy, copy the final Netlify origin into API `CLIENT_ORIGIN`, restart the API, and verify the live website.

## Final live-site checklist

- [ ] `/api/health` says API `ok` and database `connected`.
- [ ] Public page and menu load with no API/CORS warning.
- [ ] Admin login works; wrong passwords are rejected.
- [ ] Create/edit/delete a test category and dish; changes persist after refresh.
- [ ] Restaurant settings and colors save and appear on the public page.
- [ ] A reservation submits, appears in admin, and can be confirmed/cancelled.
- [ ] Cart totals are correct and WhatsApp opens with a prefilled order.
- [ ] Directly open and refresh the deployed `/admin` URL.
- [ ] No secrets are in GitHub or frontend environment settings.
- [ ] Keep Atlas backups and rotate credentials if they are ever exposed.

## What this project does not automate

- It does not create your Atlas, GitHub, Vercel, Netlify, or API-host accounts.
- It does not automatically seed the sample menu into MongoDB; add real categories and dishes in `/admin`.
- It uses public image URLs; image uploads/storage are not built.
- Deployment guides do not execute a deployment. You must enter your own private settings in provider dashboards.

For a summary of implemented features and project architecture, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).
