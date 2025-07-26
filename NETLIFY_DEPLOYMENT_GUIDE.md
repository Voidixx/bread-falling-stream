
# Netlify Deployment Guide

## Step 1: Prepare Your Files
1. Make sure all your files (index.html, style.css, script.js, config.json, and your MP4 video) are in the root directory
2. Your video file should be accessible via relative path in index.html

## Step 2: Deploy to Netlify

### Option A: Drag & Drop (Simplest)
1. Go to [netlify.com](https://netlify.com) and sign up/login
2. Go to your Sites dashboard
3. Simply drag and drop your entire project folder into the deploy area
4. Netlify will automatically deploy your site

### Option B: Git Integration (Recommended for updates)
1. Push your code to a GitHub repository
2. Connect your GitHub account to Netlify
3. Select your repository and deploy

## Step 3: Configure Settings
1. After deployment, go to Site Settings
2. Under "Build & Deploy" → "Environment Variables"
3. Add your YouTube API key as an environment variable (optional, for security)

## Step 4: Custom Domain (Optional)
1. In Site Settings → Domain Management
2. Add your custom domain
3. Netlify will handle SSL certificates automatically

## Important Notes for YouTube API Quota Management

### Current Optimizations:
- Reduced API calls from every 10 seconds to every 30 seconds
- Alternating between subscriber and like checks (60-second intervals each)
- Automatic rate limiting when quota is exceeded
- Intelligent error handling for API limits

### Daily Quota Limits:
- YouTube Data API v3 has a default quota of 10,000 units per day
- Each subscriber check costs ~3 units
- Each live stream stats check costs ~1 unit
- With current optimizations: ~4 units per minute = 5,760 units per day (well within limits)

### Additional Tips:
1. Monitor your quota usage in Google Cloud Console
2. Consider caching results locally for even better optimization
3. Only run the stream during actual live streams to save quota
4. The site automatically slows down if it hits rate limits

## Testing Your Deployment
1. Your site will be live at a Netlify URL (e.g., amazing-site-123.netlify.app)
2. Test the subscriber counter and video functionality
3. Use browser dev tools to monitor API calls and errors

## For StreamLabs Integration
1. Use your Netlify URL as the browser source
2. Set dimensions: 1920x1080 for landscape or 1080x1920 for mobile/shorts
3. The site will work the same as on Replit

**Note:** Your video file might be large for Netlify's free tier (100MB limit). Consider compressing it or upgrading to Netlify Pro if needed.
