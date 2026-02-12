# Cloudflare R2 CORS Configuration Guide

## Problem

You're getting this error:
```
Access to fetch at 'https://...r2.cloudflarestorage.com/...' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

This happens because your R2 bucket doesn't allow requests from your development server.

---

## Solution: Configure R2 CORS

### Step 1: Access Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** in the left sidebar
3. Click on your bucket (e.g., `kairo4k`)

### Step 2: Configure CORS Rules

1. Click on the **Settings** tab
2. Scroll to **CORS Policy**
3. Click **Add CORS Policy** or **Edit**

### Step 3: Add CORS Configuration

Add the following JSON configuration:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://your-production-domain.com"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 4: Save Configuration

Click **Save** and wait a few seconds for the changes to propagate.

---

## Alternative: Use Wrangler CLI

You can also configure CORS using the Wrangler CLI:

### 1. Install Wrangler (if not already installed)

```bash
npm install -g wrangler
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Create CORS Configuration File

Create a file named `cors.json`:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### 4. Apply CORS Configuration

```bash
wrangler r2 bucket cors put kairo4k --file cors.json
```

### 5. Verify CORS Configuration

```bash
wrangler r2 bucket cors get kairo4k
```

---

## Production Configuration

For production, update the `AllowedOrigins` to include your actual domain:

```json
{
  "AllowedOrigins": [
    "https://kairo4k.tv",
    "https://www.kairo4k.tv",
    "https://app.kairo4k.tv"
  ],
  "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
  "AllowedHeaders": ["*"],
  "ExposeHeaders": ["ETag"],
  "MaxAgeSeconds": 3600
}
```

**Important:** Remove `http://localhost:*` from production CORS for security.

---

## Troubleshooting

### CORS Still Not Working?

1. **Clear browser cache** and hard reload (Ctrl+Shift+R)
2. **Wait 1-2 minutes** for CORS changes to propagate
3. **Check bucket name** is correct in your `.env` file
4. **Verify credentials** are correct

### Check Current CORS Configuration

```bash
wrangler r2 bucket cors get kairo4k
```

### Remove CORS Configuration (if needed)

```bash
wrangler r2 bucket cors delete kairo4k
```

---

## Security Best Practices

### Development

- ✅ Allow `localhost` origins
- ✅ Allow all methods for testing
- ✅ Use wildcard headers for flexibility

### Production

- ✅ **Only allow your production domains**
- ✅ Limit methods to what you actually use
- ✅ Specify exact headers instead of `*`
- ❌ **Never allow `*` as origin in production**

---

## Example: Minimal Production CORS

```json
[
  {
    "AllowedOrigins": ["https://kairo4k.tv"],
    "AllowedMethods": ["GET", "PUT", "DELETE"],
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Testing CORS

After configuring CORS, test with:

```bash
curl -X OPTIONS https://your-bucket.r2.cloudflarestorage.com/test.jpg \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: PUT" \
  -v
```

You should see:
```
< access-control-allow-origin: http://localhost:5173
< access-control-allow-methods: GET, PUT, POST, DELETE, HEAD
```

---

## Quick Fix Checklist

- [ ] Go to Cloudflare Dashboard → R2 → Your Bucket
- [ ] Click Settings → CORS Policy
- [ ] Add `http://localhost:5173` to AllowedOrigins
- [ ] Add `GET, PUT, POST, DELETE, HEAD` to AllowedMethods
- [ ] Add `*` to AllowedHeaders
- [ ] Save configuration
- [ ] Wait 1-2 minutes
- [ ] Clear browser cache
- [ ] Retry upload

---

**After configuring CORS, your R2 uploads should work!** 🎉
