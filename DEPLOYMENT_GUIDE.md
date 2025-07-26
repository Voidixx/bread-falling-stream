
# Deployment Guide

## Deploying to Replit (Recommended)

1. Your project is already set up on Replit
2. Click the "Deploy" button in the top menu
3. Choose "Static Site" deployment
4. Your site will be live at a Replit domain

## For StreamLabs Browser Source

1. After deploying on Replit, copy your deployment URL
2. In StreamLabs:
   - Add a "Browser Source"
   - Paste your Replit deployment URL
   - Set width: 1920, height: 1080
   - Check "Refresh browser when scene becomes active"
   - Uncheck "Control audio via OBS" if you want the bread video sound

## Adding Your Own Video

1. Upload your MP4 file to the Replit project (drag and drop into the file explorer)
2. Rename it to `your-video.mp4` or update the `src` attribute in `index.html`
3. The video will only play when someone actually subscribes to your channel
4. Make sure your video file is not too large (Replit has storage limits)

## Important Notes

- No more simulated interactions - only real YouTube API events trigger effects
- Real-time subscriber detection works but may have delays due to YouTube API rate limits
- The video only plays when new subscribers are detected
- Like effects only trigger when your live stream actually receives likes
- Make sure your API key has proper permissions for YouTube Data API v3

## API Setup

1. Go to Google Cloud Console
2. Enable YouTube Data API v3
3. Create credentials (API Key)
4. Add your API key to config.json

## Live Stream Setup

1. Start your YouTube live stream
2. Use the deployed URL as a browser source in your streaming software
3. The page will automatically detect new subscribers and likes
4. Bread video plays automatically on new subscribers

## Screen Capture for Shorts

For YouTube Shorts live streams:
- Use OBS or similar software
- Set canvas to 1080x1920 (vertical)
- Add browser source with your deployed URL
- Crop/scale as needed for mobile-friendly viewing
