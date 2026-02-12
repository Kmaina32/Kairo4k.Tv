# Kairo 4K | Autonomous Stream Nexus

A premium 4K IPTV aggregator with intelligent signal processing and cinematic playback controls. Built with React, Vite, and Supabase.

## 🚀 Vision
Kairo 4K is designed to provide a high-end, futuristic streaming experience. It features "signal locking" aesthetics, real-time metrics, and a robust media management system.

## 📁 Project Structure

```text
├── src/                # Core application source
│   ├── components/     # UI components (Admin, Viewer, Frontend, Backend)
│   ├── services/       # API & external service integrations
│   ├── App.tsx         # Main application logic
│   ├── constants.ts    # Application-wide constants & defaults
│   ├── index.tsx       # Entry point
│   ├── types.ts        # TypeScript definitions
│   └── vite-env.d.ts   # Vite environment types
├── docs/               # Manuals, setup guides, and project plans
├── database/           # SQL schemas and database migration scripts
├── playlists/          # M3U signal sources and validation lists
├── scripts/            # Utility scripts (Python validators, seeders)
├── supabase/           # Supabase edge functions and local config
├── index.html          # Application shell
├── vite.config.ts      # Vite build configuration
└── tsconfig.json       # TypeScript configuration
```

## 🛠️ Tech Stack
- **Frontend**: React 18, Tailwind CSS, HLS.js
- **Backend**: Supabase (Auth, DB, Edge Functions)
- **Deployment**: Vite, R2 Storage (Media)

## 🔧 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file with:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CLOUDFLARE_R2_URL`

3. **Development**:
   ```bash
   npm run dev
   ```

4. **Build**:
   ```bash
   npm run build
   ```

## 📱 Android Native App

This project uses Capacitor to wrap the React web app into a native Android application.

### Prerequisites
- **Android Studio** (with Android SDK and Command Line Tools)
- **Java Development Kit (JDK) 17+**

### Running on Android Emulator/Device
1. **Sync Web Assets**:
   Whenever you make changes to the React code, run:
   ```bash
   npm run build:android
   ```
   This builds the web app and copies the assets to the Android project.

2. **Open in Android Studio**:
   ```bash
   npm run android
   ```
   This will launch Android Studio. From there, you can run the app on an emulator or a connected device.

## 📡 Signal Management
Signals are processed via the `m3uParser` service and can be Proxied to avoid CORS issues. See `playlists/` for sample sources and `scripts/stream_validator.py` for health checks.
