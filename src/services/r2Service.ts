import { S3Client, ListObjectsV2Command, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';

// Cloudflare R2 Configuration
const R2_ACCOUNT_ID = import.meta.env.VITE_CF_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = import.meta.env.VITE_CF_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = import.meta.env.VITE_CF_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = import.meta.env.VITE_CF_BUCKET_NAME || '';

const R2_ENDPOINT = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const PUBLIC_URL = import.meta.env.VITE_CF_PUBLIC_URL || 'https://pub-d51716508a97e95180a31909e42b26b1.r2.dev';

// Initialize S3 Client for R2
const r2Client = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export interface StorageStats {
    totalObjects: number;
    totalSize: number;
    sizeFormatted: string;
    videos: number;
    images: number;
    other: number;
}

export interface R2Object {
    key: string;
    size: number;
    lastModified: Date;
    url: string;
}

class CloudflareR2Service {
    /**
     * Upload a file to R2 with real progress
     */
    async uploadFile(
        file: File,
        path: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<string> {
        try {
            const key = `${path}/${Date.now()}_${file.name}`;

            const upload = new Upload({
                client: r2Client,
                params: {
                    Bucket: R2_BUCKET_NAME,
                    Key: key,
                    Body: file,
                    ContentType: file.type,
                },
                queueSize: 4,
                partSize: 1024 * 1024 * 5, // 5MB parts
                leavePartsOnError: false,
            });

            upload.on('httpUploadProgress', (progress) => {
                if (onProgress && progress.loaded && progress.total) {
                    onProgress({
                        loaded: progress.loaded,
                        total: progress.total,
                        percentage: Math.round((progress.loaded / progress.total) * 100),
                    });
                }
            });

            await upload.done();
            return `${PUBLIC_URL}/${key}`;
        } catch (error) {
            console.error('R2 Upload Error:', error);
            throw new Error('Failed to upload file to R2');
        }
    }

    /**
     * Upload multiple files
     */
    async uploadBatch(
        files: File[],
        path: string,
        onFileProgress?: (filename: string, progress: UploadProgress) => void
    ): Promise<string[]> {
        const uploads = files.map((file) =>
            this.uploadFile(file, path, (progress) => {
                onFileProgress?.(file.name, progress);
            })
        );
        return Promise.all(uploads);
    }

    /**
     * List objects in bucket
     */
    async listObjects(prefix?: string): Promise<R2Object[]> {
        try {
            const command = new ListObjectsV2Command({
                Bucket: R2_BUCKET_NAME,
                Prefix: prefix,
                MaxKeys: 1000,
            });

            const response = await r2Client.send(command);

            return (response.Contents || []).map((item) => ({
                key: item.Key || '',
                size: item.Size || 0,
                lastModified: item.LastModified || new Date(),
                url: `${PUBLIC_URL}/${item.Key}`,
            }));
        } catch (error) {
            console.error('R2 List Error:', error);
            return [];
        }
    }

    /**
     * Delete object from R2
     */
    async deleteObject(key: string): Promise<boolean> {
        try {
            const command = new DeleteObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
            });

            await r2Client.send(command);
            return true;
        } catch (error) {
            console.error('R2 Delete Error:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     */
    async getStorageStats(): Promise<StorageStats> {
        try {
            const objects = await this.listObjects();

            let totalSize = 0;
            let videos = 0;
            let images = 0;
            let other = 0;

            objects.forEach((obj) => {
                totalSize += obj.size;
                const ext = obj.key.split('.').pop()?.toLowerCase() || '';

                if (['mp4', 'webm', 'mov', 'avi', 'mkv', 'm3u8'].includes(ext)) {
                    videos++;
                } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                    images++;
                } else {
                    other++;
                }
            });

            return {
                totalObjects: objects.length,
                totalSize,
                sizeFormatted: this.formatBytes(totalSize),
                videos,
                images,
                other,
            };
        } catch (error) {
            console.error('R2 Stats Error:', error);
            return {
                totalObjects: 0,
                totalSize: 0,
                sizeFormatted: '0 B',
                videos: 0,
                images: 0,
                other: 0,
            };
        }
    }

    /**
     * Extract video metadata using browser APIs
     */
    async extractVideoMetadata(file: File): Promise<{
        duration: number;
        width: number;
        height: number;
        thumbnail?: string;
    }> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            const cleanup = () => {
                URL.revokeObjectURL(video.src);
                video.remove();
            };

            video.onloadedmetadata = () => {
                if (video.duration === Infinity) {
                    video.currentTime = 0;
                } else {
                    video.currentTime = Math.min(5, video.duration / 2);
                }
            };

            video.onseeked = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');

                    if (ctx) {
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

                        resolve({
                            duration: video.duration,
                            width: video.videoWidth,
                            height: video.videoHeight,
                            thumbnail,
                        });
                    } else {
                        resolve({
                            duration: video.duration,
                            width: video.videoWidth,
                            height: video.videoHeight,
                        });
                    }
                } catch (e) {
                    console.warn('Thumbnail generation failed', e);
                    resolve({
                        duration: video.duration || 0,
                        width: video.videoWidth || 0,
                        height: video.videoHeight || 0
                    });
                } finally {
                    cleanup();
                }
            };

            video.onerror = () => {
                reject(new Error('Failed to load video metadata'));
                cleanup();
            };

            video.src = URL.createObjectURL(file);
        });
    }

    /**
     * Format bytes to human-readable size
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * Generate thumbnail from video file
     */
    async generateThumbnail(videoFile: File): Promise<File> {
        const metadata = await this.extractVideoMetadata(videoFile);

        if (!metadata.thumbnail) {
            throw new Error('Failed to generate thumbnail');
        }

        const base64Response = await fetch(metadata.thumbnail);
        const blob = await base64Response.blob();

        return new File([blob], `${videoFile.name}_thumb.jpg`, { type: 'image/jpeg' });
    }
}

export const r2Service = new CloudflareR2Service();
