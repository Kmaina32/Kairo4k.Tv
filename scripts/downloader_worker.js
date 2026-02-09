import { createClient } from '@supabase/supabase-js';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { promisify } from 'util';

const execPromise = promisify(exec);
dotenv.config();

function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-');    // Replace multiple - with single -
}

// Config
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const R2_ACCOUNT_ID = process.env.VITE_CF_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.VITE_CF_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.VITE_CF_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.VITE_CF_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.VITE_CF_PUBLIC_URL;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase configuration. Check your .env file.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

const DOWNLOAD_DIR = path.join(process.cwd(), 'temp_downloads');
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

// Throttle updates to Supabase to once every 2 seconds per task
const lastUpdate = new Map();

async function updateTask(id, updates) {
    const now = Date.now();
    const last = lastUpdate.get(id) || 0;

    // Always update if it's a status change or progress is 100 or 0
    const isCritical = updates.status || updates.progress === 100 || updates.progress === 0;

    if (isCritical || (now - last > 2000)) {
        await supabase.from('download_tasks').update(updates).eq('id', id);
        lastUpdate.set(id, now);
        if (updates.progress) console.log(`[Task ${id.split('-')[0]}] Progress: ${updates.progress}%`);
    }
}

async function addToMediaLibrary(task, displayTitle, r2Url, duration, description) {
    const relativeUrl = r2Url.replace(R2_PUBLIC_URL + '/', '');

    await supabase.from('media_library').insert({
        title: displayTitle,
        category: 'Movie',
        genre: 'Remote Download',
        stream_url: relativeUrl,
        is_active: true,
        duration: duration || 0,
        description: description || `Imported from ${task.type === 'youtube' ? 'YouTube' : 'Torrent'}: ${task.url}`
    });
}

async function uploadToR2(id, localPath, filename, folder) {
    await updateTask(id, { status: 'uploading', progress: 0 });

    const fileStream = fs.createReadStream(localPath);
    const slug = slugify(filename.replace(/\.[^/.]+$/, ""));
    const key = `${folder}/${Date.now()}_${slug}${path.extname(filename)}`;

    const upload = new Upload({
        client: r2Client,
        params: {
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileStream,
            ContentType: 'video/mp4',
        },
        queueSize: 4,
        partSize: 1024 * 1024 * 5,
    });

    upload.on('httpUploadProgress', (progress) => {
        if (progress.loaded && progress.total) {
            const p = Math.round((progress.loaded / progress.total) * 100);
            updateTask(id, { progress: p });
        }
    });

    await upload.done();

    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

    return `${R2_PUBLIC_URL}/${key}`;
}

async function processYoutube(task) {
    const id = task.id;
    console.log(`[YT] Starting: ${task.url}`);

    try {
        await updateTask(id, { status: 'downloading', progress: 0, error: null });

        // Get info first
        console.log(`[YT] Fetching info for: ${task.url}`);
        const { stdout: infoRaw } = await execPromise(`yt-dlp -j --flat-playlist --no-warnings "${task.url}"`);
        const info = JSON.parse(infoRaw);

        // Use Task ID for local filename to avoid character issues
        const cleanTitle = info.title.replace(/[^a-zA-Z0-9._-]/g, '_');
        const localFilename = `${task.id}.mp4`;
        const localPath = path.join(DOWNLOAD_DIR, localFilename);

        await updateTask(id, { filename: cleanTitle, progress: 5 });

        // Detect if ffmpeg exists
        let hasFfmpeg = false;
        try {
            await execPromise('ffmpeg -version');
            hasFfmpeg = true;
        } catch (e) {
            console.warn('[YT] FFmpeg not found, falling back to single file download');
        }

        // Quality mapping
        const quality = task.quality || '720p';
        const heightMatch = quality.match(/(\d+)p/);
        const height = heightMatch ? heightMatch[1] : null;

        let formatQuery;
        if (hasFfmpeg) {
            if (height) {
                formatQuery = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${height}][ext=mp4]/best[height<=${height}]`;
            } else {
                formatQuery = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';
            }
        } else {
            // Without ffmpeg, we can't merge video+audio, so we must pick the best single file
            if (height) {
                formatQuery = `best[height<=${height}][ext=mp4]/best[height<=${height}]`;
            } else {
                formatQuery = 'best[ext=mp4]/best';
            }
        }

        // Speed optimization: --concurrent-fragments 5, --buffer-size 16K
        // Added --restrict-filenames to be safe, though we are using specific output name
        const downloadCommand = `yt-dlp --newline --concurrent-fragments 5 --no-warnings -f "${formatQuery}" -o "${localPath}" "${task.url}"`;
        console.log(`[YT] 🚀 Executing Download: ${downloadCommand}`);

        const downloadProcess = exec(downloadCommand);

        downloadProcess.stdout.on('data', (data) => {
            const match = data.match(/\[download\]\s+(\d+\.\d+)%/);
            if (match) {
                const p = Math.round(parseFloat(match[1]));
                // Only update if progress changed meaningfully to avoid spam
                updateTask(id, { progress: p });
            }
        });

        downloadProcess.stderr.on('data', (data) => console.log(`[YT-dlp Stderr] ${data}`));

        await new Promise((resolve, reject) => {
            downloadProcess.on('close', (code) => {
                if (code === 0) resolve();
                else {
                    // Check if file exists anyway (sometimes yt-dlp warns but succeeds)
                    if (fs.existsSync(localPath)) {
                        console.warn(`[YT] yt-dlp exited with code ${code} but file exists. Proceeding.`);
                        resolve();
                    } else {
                        reject(new Error(`yt-dlp exited with code ${code}`));
                    }
                }
            });
        });

        if (!fs.existsSync(localPath)) {
            throw new Error(`Download finished but file not found at ${localPath}`);
        }

        // Upload to R2 with the REAL title
        const r2Filename = `${cleanTitle}.mp4`;
        const r2Url = await uploadToR2(id, localPath, r2Filename, 'videos');

        await addToMediaLibrary(task, info.title, r2Url, info.duration, info.description);

        await updateTask(id, { status: 'completed', progress: 100 });
        console.log(`[YT] Completed: ${localPath} -> ${r2Url}`);

    } catch (err) {
        console.error(`[YT] Error:`, err);
        await updateTask(id, { status: 'failed', error: err.message });
    }
}

async function processTorrent(task) {
    const id = task.id;
    console.log(`[Torrent] Starting: ${task.url}`);

    try {
        await updateTask(id, { status: 'downloading', progress: 0 });

        const downloadProcess = exec(`webtorrent download "${task.url}" -o "${DOWNLOAD_DIR}"`);

        downloadProcess.stdout.on('data', (data) => {
            const match = data.match(/(\d+\.\d+)%/);
            if (match) {
                const p = Math.round(parseFloat(match[1]));
                updateTask(id, { progress: p });
            }
        });

        await new Promise((resolve, reject) => {
            downloadProcess.on('close', (code) => code === 0 ? resolve() : reject(new Error(`webtorrent exited with ${code}`)));
        });

        const files = fs.readdirSync(DOWNLOAD_DIR);
        // Find the most recently changed file that is probably the video
        const largestFile = files.sort((a, b) => fs.statSync(path.join(DOWNLOAD_DIR, b)).size - fs.statSync(path.join(DOWNLOAD_DIR, a)).size)[0];
        const localPath = path.join(DOWNLOAD_DIR, largestFile);

        const r2Url = await uploadToR2(id, localPath, largestFile, 'videos');
        await addToMediaLibrary(task, largestFile.replace(/_/g, ' ').replace(/\.[^/.]+$/, ""), r2Url, 0);

        await updateTask(id, { status: 'completed', progress: 100 });
        console.log(`[Torrent] Completed: ${largestFile}`);

    } catch (err) {
        console.error(`[Torrent] Error:`, err);
        await updateTask(id, { status: 'failed', error: err.message });
    }
}

const activeProcessing = new Set();

async function main() {
    console.log('🚀 Remote Downloader Worker Started');

    // Polling interval
    setInterval(async () => {
        const { data: tasks, error } = await supabase
            .from('download_tasks')
            .select('*')
            .eq('status', 'pending');

        if (error) {
            console.error('Polling Error:', error);
            return;
        }

        for (const task of tasks) {
            if (activeProcessing.has(task.id)) continue;

            activeProcessing.add(task.id);
            const process = task.type === 'youtube' ? processYoutube(task) : processTorrent(task);

            process.finally(() => {
                activeProcessing.delete(task.id);
            });
        }
    }, 5000);
}

main();
