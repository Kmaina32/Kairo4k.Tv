
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const R2_ACCOUNT_ID = process.env.VITE_CF_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.VITE_CF_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.VITE_CF_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.VITE_CF_BUCKET_NAME;

const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function testUpload() {
    try {
        console.log('Testing R2 Upload...');

        // Create a dummy file
        const testFile = 'test_upload.txt';
        fs.writeFileSync(testFile, 'This is a test upload from specific script');

        const fileStream = fs.createReadStream(testFile);

        const upload = new Upload({
            client: client,
            params: {
                Bucket: R2_BUCKET_NAME,
                Key: `test/${Date.now()}_test.txt`,
                Body: fileStream,
                ContentType: 'text/plain',
            },
        });

        upload.on('httpUploadProgress', (progress) => {
            console.log(progress);
        });

        await upload.done();
        console.log('Upload Success!');

        // Clean up
        fs.unlinkSync(testFile);

    } catch (err) {
        console.error('Upload Failed:', err);
    }
}

testUpload();
