# Haden RestaurantOS — Development Guide

## Project overview

A single-restaurant-per-deployment Pakistani restaurant site and reusable client demo. Public pages use configurable sample content and connect to a REST API when configured. Keep restaurant settings in one frontend configuration and server-side secrets in environment variables. Multi-restaurant tenancy is out of scope.

**Architecture**

- `client/`: React + Vite, React Router, Tailwind CSS, Lucide React. Public pages, menu/cart state, admin UI, and API client.
- `server/`: Node.js + Express REST API, Mongoose models, validation, and protected admin routes.
- MongoDB Atlas: persistent dishes, categories, restaurant settings, and reservations.
- The browser calls the API using `VITE_API_BASE_URL`. The API connects to Atlas using its private `MONGODB_URI`; never put database credentials or JWT secrets in frontend variables.
- The public site can show its sample menu without the API; persistent admin changes and reservations require a working API and MongoDB.

## Prerequisites

- Node.js LTS (npm included), Git, a code editor, and a GitHub account.
- A MongoDB Atlas account is needed only when database work begins. Create a free development cluster if available in your region; check current provider limits.
- PowerShell commands below run from the project root. Use a supported Node LTS release.

## Planned folder structure

```text
client/
  public/images/                 # Optional locally hosted licensed images
  src/
    config/restaurant.js         # Brand, colors, sections, contact, hours
    data/                        # Initial mock menu data
    lib/                         # API client, currency/WhatsApp helpers and tests
    App.jsx
    main.jsx
    index.css
    App.css
server/
  src/
    middleware/                  # Authentication and request validation
    models/                      # Dish, category, reservation, settings
    routes/                      # REST API routes
    app.js
    server.js
  test/                          # API smoke tests
  .env.example
```

## Phases

Complete in order; each phase should be tested before moving on.

### 1. Initialize the project

From the root:

```powershell
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom lucide-react
npm install -D tailwindcss @tailwindcss/vite vitest jsdom
```

Configure `client/vite.config.js` and `client/src/index.css` for Tailwind v4. Create `client/src/config/restaurant.js` with the initial palette (`#151515`, `#20201E`, `#F5F0E8`, `#B7B0A6`, `#C77B45`) and editable restaurant defaults. Create `server/`, initialize it with `npm init -y`, then install:

```powershell
cd ..\server
npm install express mongoose dotenv cors helmet express-rate-limit zod bcryptjs jsonwebtoken
npm install -D supertest
```

Add server scripts (`start`: `node src/server.js`, `dev`: `node --watch src/server.js`, `test`: `node --test`) in `server/package.json`. Add root `.gitignore` entries for `node_modules/`, `dist/`, `.env`, and `.env.*` except `.env.example`. Do not add secrets to Git.

### 2. Build the public homepage (mock data)

The implemented public homepage and responsive sections are composed in `client/src/App.jsx` and styled in `client/src/App.css`. Update mock dishes in `client/src/data/menu.js` and brand defaults in `client/src/config/restaurant.js`. Use accessible controls, licensed images, and the dark editorial design direction.

Run from `client/`:

```powershell
npm run dev
```

### 3. Add menu browsing, cart, and WhatsApp ordering

Menu search/category filters, descriptions, availability, cart state, order summary, and WhatsApp ordering are implemented in `client/src/App.jsx` and `client/src/lib/format.js`. Keep prices in PKR and show unavailable dishes as unavailable rather than orderable. Store the WhatsApp number in `restaurant.js`.

### 4. Build the API and MongoDB models

The API is organized under `server/src/app.js`, `server/src/server.js`, `server/src/models/`, `server/src/routes/`, and `server/src/middleware/`. MongoDB connects in `server/src/server.js`. Validated REST endpoints cover dishes, categories, restaurant settings, and reservations. Helmet, restricted CORS, and request validation are enabled. Keep database access and credentials on the server.

Create `server/.env.example` (placeholders only):

```dotenv
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5173
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=replace-with-a-bcrypt-hash
```

Copy this to `server/.env` and replace placeholders locally; never commit `.env`. In Atlas, create a database user, allow only appropriate network access, and copy the connection string. Do not use broad network access for production.

The API has public read routes for dishes/categories/settings, validated reservation requests, and JWT-protected admin routes for menu, categories, settings, and reservation status. Login is rate-limited and public admin registration is disabled. Set a bcrypt `ADMIN_PASSWORD_HASH` (generate a local hash with `node -e "require('bcryptjs').hash('replace-locally', 12).then(console.log)"`) and a unique `JWT_SECRET` of at least 32 characters. The sample menu is frontend mock data and is not automatically seeded into MongoDB; add dishes and categories through admin after configuration.

### 5. Connect the frontend and backend

`client/.env.example` is provided. Copy it to local `client/.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

Only public configuration belongs in `VITE_` variables. The shared API client reads live menu/category/settings data when configured and retains sample menu content if the API cannot be reached; requests show failures explicitly. Start the server from `server/` with `npm run dev` and the frontend from `client/` with `npm run dev` in a second terminal. Configure API CORS to allow the exact frontend origin.

### 6. Add admin authentication and CRUD

The admin screen is `/admin`. It uses the configured email and bcrypt hash, keeps the JWT in memory (refreshing signs out), and supports dish create/edit/delete, category create/delete, settings/branding updates, and reservation status management. Protected API routes validate mutations. The token is sent in an Authorization header and is not persisted in local storage.

### 7. Add customization and reservation persistence

The admin editor configures restaurant name/logo, colors, hero, offer, images, hours, contact details, and visible sections. Reservation submissions persist through the API and appear in the admin view. Typography choices and media uploads are not implemented; use the configured font stack and licensed public image URLs. Keep one active restaurant configuration per deployment.

### 8. Test, optimize, and deploy

Run `cd client; npm test`, `npm run lint`, and `npm run build`; run `cd server; npm test`. The production build and focused checks are verified. Database-backed manual tests still require Atlas and admin environment values. Test the checklist below, fix accessibility and responsive issues, and document production environment variables before deployment.

## Local connection and manual tests

1. Run MongoDB-backed API with `server/.env`, then run Vite with `client/.env`. Expected: frontend loads and API requests reach `http://localhost:5000/api`; the server connects to Atlas.
2. Resize to mobile and desktop; use keyboard Tab/Enter. Expected: navigation and forms remain usable, focus is visible, text is readable, and images have appropriate alt text.
3. Search/filter the menu and inspect an unavailable dish. Expected: results update, unavailable items cannot be ordered, and prices show PKR.
4. Change cart quantities and remove an item. Expected: line totals and order total update correctly; WhatsApp opens with the selected items and total in a prefilled message.
5. Submit invalid then valid reservation data. Expected: inline validation prevents invalid submission; success is explicit, and the reservation is stored once backend persistence is complete.
6. Try admin routes while logged out, then sign in and change a dish. Expected: protected operations are rejected while logged out; valid admin edits persist and appear on the public menu.
7. Stop the API or use an invalid database URI. Expected: the UI reports a useful failure; the server reports connection errors instead of pretending the operation succeeded.

## Common errors

- `npm` or `node` not found: install Node.js LTS and reopen PowerShell.
- Vite port is busy: use the alternate port it prints, then update `CLIENT_ORIGIN` if needed.
- CORS error: match `CLIENT_ORIGIN` exactly to the browser origin and restart the API.
- MongoDB connection timeout/authentication failure: verify Atlas IP access, database user credentials, encoded special characters in the URI, and database name.
- Missing environment variable: check that `.env` is in the correct package directory; restart the process after edits.
- `401`/`403` on admin requests: sign in again and verify the bearer token, exact CORS origin, and route protection settings.
- Broken image: verify the file under `client/public/images/` and use its public-root URL, for example `/images/dish.jpg`.

## GitHub and security

- Commit source and `.env.example`; never commit `.env`, tokens, database URIs, passwords, or private image credentials.
- Before each push, check `git status` and inspect the staged diff. Use small, descriptive commits and push feature branches; enable GitHub secret scanning if available.
- Keep dependencies updated; validate inputs server-side, hash passwords, rate-limit login, restrict CORS, and authorize every admin mutation. Use HTTPS in production and rotate any accidentally exposed secret immediately.

## Deployment

For beginner-friendly, click-by-click GitHub and Vercel/Netlify instructions, see [GITHUB_DEPLOYMENT_GUIDE.md](./GITHUB_DEPLOYMENT_GUIDE.md).

1. Push the project to GitHub without secrets.
2. Create a MongoDB Atlas production database/user with restricted network access and backups appropriate to the client.
3. Deploy `server/` to a Node-compatible host (for example Render). Set `MONGODB_URI`, a newly generated `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `NODE_ENV=production`, `PORT` as required by the host, and the deployed `CLIENT_ORIGIN` in its environment settings. Use HTTPS.
4. Deploy `client/` to a static Vite host (for example Vercel). Set `VITE_API_BASE_URL` to the deployed API URL plus `/api`, then build with `npm run build` in `client/`. Configure the host's SPA fallback to `index.html`.
5. Set production API CORS to the exact deployed client origin and test menu, admin token expiry, reservation, and WhatsApp flows on the live site. Never put server secrets in frontend hosting settings.

Free tiers and provider settings can change; confirm current limits before selecting a host. Deployment is not complete until you provide/configure the GitHub repository, Atlas database, hosting projects, and their environment variables.

## Client customization

For a new single-client deployment, update `client/src/config/restaurant.js` for name, palette, hero, offer, sections, contact, hours, socials, and WhatsApp number. Update mock menu content under `client/src/data/menu.js`; use licensed images from client assets or a reputable source such as Unsplash. Once API-backed settings are configured, change restaurant settings and menu content through `/admin`. Do not hard-code client secrets or introduce multi-tenant logic for a single deployment.

## Progress

**Completed**

- [x] Inspected the workspace and wrote this development plan.
- [x] Set up React/Vite, Tailwind CSS, Express, Mongoose, and package scripts.
- [x] Built the responsive public restaurant site and configurable sample menu.
- [x] Added menu search/categories, PKR prices, cart quantities, and WhatsApp ordering.
- [x] Added validated reservation UI/API, status management, and MongoDB models.
- [x] Added admin login and protected dish/category/settings/reservation operations.
- [x] Added central brand settings, configurable visible sections, palette, hero, offer, hours, and image URLs.
- [x] Added client/API tests and verified build and lint.

**Pending external setup and verification**

- [ ] Copy `.env.example` files to local `.env` files and configure Atlas/admin credentials.
- [ ] Add dishes and categories to MongoDB; test live persistence, auth expiry, settings, and reservations.
- [ ] Create/connect the GitHub repository, deploy API and frontend, and run live production checks.
