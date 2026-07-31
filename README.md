# Aashe

Aashe is a platform connecting users who want to donate items with nearby NGOs and volunteers who facilitate the pickup.

## Local Development

1. Ensure you have Node.js and PostgreSQL installed.
2. Create a `.env` file in the root based on `.env.example`:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/aashe
   JWT_SECRET=your_super_secret_jwt_key
   ```
3. Create a Postgres database named `aashe`.
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the server (this will automatically create the `users` table):
   ```bash
   npm start
   ```
6. Open `http://localhost:3000` in your browser.

## Deployment to Render

Render offers a free tier for Web Services and PostgreSQL.

### Step 1: Connect your GitHub Repository
1. Push this codebase to a GitHub repository.
2. Create an account on [Render](https://render.com/).
3. In the Render Dashboard, click **New** -> **Blueprint**.
4. Connect your GitHub account and select your repository.

### Step 2: Deploy using render.yaml
1. Render will automatically detect the `render.yaml` file in the root directory.
2. It will provision:
   - A Free Tier PostgreSQL Database.
   - A Web Service for the Node.js application.
3. The `DATABASE_URL` is automatically injected into your Web Service by the `render.yaml` blueprint.
4. You only need to provide the `JWT_SECRET` environment variable during the setup or in the Web Service settings later.
5. Click **Apply** to deploy the infrastructure.

### Note on Render PostgreSQL Free Tier
- The free PostgreSQL database on Render expires after 30 days and has limited storage (1GB). It is perfect for a hackathon.
- If you need a permanent free database, consider Neon, Supabase, or ElephantSQL, and update the `DATABASE_URL` environment variable accordingly in your Web Service settings.

## Hackathon Features
- **Frontend**: Vanilla HTML/CSS/JS with fully responsive premium UI. No Tailwind used.
- **Backend**: Node.js, Express, jsonwebtoken, bcryptjs.
- **Database**: PostgreSQL (currently managing real User Authentication).
- **Simulations**: Donation requests, analytics, and driver matching are simulated on the frontend to prioritize demo speed while maintaining a real secure authentication system.

Made by Ishita and Mahima.
