# Cloudflare R2 Setup Guide

This application now includes Cloudflare R2 integration for direct media uploads!

## 🔑 Getting Your R2 Credentials

### Step 1: Create R2 Bucket
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2** in the sidebar
3. Click **Create bucket**
4. Name your bucket (e.g., "kairo-media")
5. Click **Create bucket**

### Step 2: Generate API Tokens
1. In R2, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Give it a name (e.g., "Kairo Upload Token")
4. Set Permissions: **Object Read & Write**
5. Click **Create API Token**
6. **IMPORTANT**: Copy the following values immediately (they won't be shown again):
   - Access Key ID
   - Secret Access Key

### Step 3: Get Your Account ID
1. In the Cloudflare Dashboard, click on any page
2. Your **Account ID** is in the URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/...`
3. Or find it in the R2 overview page

### Step 4: Make Your Bucket Public (Optional)
1. Go to your bucket settings
2. Click on **Settings** → **Public Access**
3. Click **Allow Access** and copy the public URL
4. Format: `https://pub-xxxxxx.r2.dev`

## 📝 Configure .env File

Update your `.env` file with your actual values:

```env
# Cloudflare R2 Configuration
VITE_CF_ACCOUNT_ID=your_account_id_here
VITE_CF_ACCESS_KEY_ID=your_access_key_id_here
VITE_CF_SECRET_ACCESS_KEY=your_secret_access_key_here
VITE_CF_BUCKET_NAME=your_bucket_name_here
```

### Example:
```env
VITE_CF_ACCOUNT_ID=a1b2c3d4e5f6
VITE_CF_ACCESS_KEY_ID=abcd1234567890
VITE_CF_SECRET_ACCESS_KEY=your_secret_key_value
VITE_CF_BUCKET_NAME=kairo-media
```

## 🚀 Features Enabled

Once configured, you'll have access to:

- **📤 Media Upload**: Upload videos and covers directly to R2 from admin panel
- **🎬 Auto Metadata**: Automatic video duration, resolution extraction
- **🖼️ Thumbnail Generation**: Auto-generate thumbnails from videos
- **📊 Storage Analytics**: View storage usage, file counts, distribution
- **🔗 URL Management**: Automatic URL generation for uploaded media

## 🔧 Testing Your Setup

1. Restart your dev server: `npm run dev`
2. Log in to admin dashboard
3. Click **Upload** tab
4. Try uploading a small test video
5. Check **Storage** tab to see analytics

## 💡 Tips

- R2 has **no egress fees** - perfect for video streaming!
- First 10GB storage is free per month
- Use the auto-thumbnail feature to save storage
- Keep your secret keys secure and never commit them to Git

## 🆘 Troubleshooting

**Upload fails?**
- Check your API token has Read & Write permissions
- Verify Account ID is correct
- Ensure bucket name matches exactly

**Can't see uploaded files?**
- Verify public access is enabled on your bucket
- Check the PUBLIC_URL in r2Service.ts matches your bucket's public URL

**403 Errors?**
- Your API token may have expired
- Check bucket permissions

## 📚 Learn More

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://www.cloudflare.com/products/r2/)
- [AWS S3 SDK (used for R2)](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
