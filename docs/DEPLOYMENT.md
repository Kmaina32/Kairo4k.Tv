# 🚀 Deployment Guide: Full Stack Setup

## Why Do I Need a Backend Worker?

Your web application (React) runs in the user's browser. Browsers **cannot** run heavy video processing tools like `ffmpeg` or `yt-dlp` due to security restrictions.

- **Local Development**: Your computer runs the `downloader_worker.js` script, acting as the backend server.
- **Deployed App**: If you only deploy the frontend (e.g., to Vercel/Netlify), the backend worker is missing, so downloads fail.

To fix this, you must deploy the **Backend Worker** alongside your frontend.

---

## Option 1: Deploy with Render (Recommended, Free Tier Available)

We have included a `render.yaml` file to make this easy.

1.  **Push your code** to GitHub/GitLab.
2.  **Create a Render Account** at [render.com](https://render.com).
3.  Click **New +** -> **Blueprint**.
4.  Connect your repository.
5.  Render will detect `render.yaml` and propose 2 services:
    - **Web Service**: Your React frontend.
    - **Worker**: The backend video processor (Node.js + ffmpeg + yt-dlp).
6.  **Set Environment Variables**:
    You will need to provide your Supabase and Cloudflare R2 credentials for both services.

---

## Option 2: Deploy Backend Worker via Docker

If you prefer another provider (Railway, DigitalOcean, AWS, etc.), you can deploy the Docker container manually.

1.  **Build the Docker Image**:
    ```bash
    docker build -t streamer-worker .
    ```

2.  **Run the Container**:
    Pass your environment variables (`-e`) to the container.
    ```bash
    docker run -d \
      -e VITE_SUPABASE_URL=... \
      -e VITE_SUPABASE_ANON_KEY=... \
      -e VITE_CF_ACCOUNT_ID=... \
      -e VITE_CF_ACCESS_KEY_ID=... \
      -e VITE_CF_SECRET_ACCESS_KEY=... \
      -e VITE_CF_BUCKET_NAME=... \
      -e VITE_CF_PUBLIC_URL=... \
      streamer-worker
    ```

---

## Environment Variables Reference

Ensure these are set in your deployment platform:

| Variable | Description |
| :--- | :--- |
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key |
| `VITE_CF_ACCOUNT_ID` | Cloudflare Account ID |
| `VITE_CF_ACCESS_KEY_ID` | R2 Access Key ID |
| `VITE_CF_SECRET_ACCESS_KEY` | R2 Secret Access Key |
| `VITE_CF_BUCKET_NAME` | R2 Bucket Name (e.g. `kairo4k`) |
| `VITE_CF_PUBLIC_URL` | Public R2 URL (e.g. `https://pub-....r2.dev`) |
