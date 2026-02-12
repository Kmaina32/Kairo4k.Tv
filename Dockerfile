FROM node:18-slim

# Install system dependencies required for video processing
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp via pip (ensures latest version)
# We use --break-system-packages because we are in a container environment
RUN pip3 install yt-dlp --break-system-packages

WORKDIR /app

# Copy dependency definitions
COPY package.json package-lock.json* ./

# Install dependencies (including dev deps if needed, but production usually fine)
# We need dotenv, aws-sdk, supabase-js which are in 'dependencies'
RUN npm ci

# Copy the rest of the application code
COPY . .

# Create a non-root user for security (optional but good practice)
# RUN useradd -m myuser
# USER myuser

# The command to run the worker script
CMD ["node", "scripts/downloader_worker.js"]
