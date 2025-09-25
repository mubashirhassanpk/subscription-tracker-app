# Chrome Extension Setup Guide

Follow these steps to install and configure the Subscription Tracker Chrome extension:

## Installation

1. **Load the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" ON (top right corner)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder from this project
   - The extension icon should appear in your toolbar

## Configuration

2. **Get Your App Details**
   - Your app URL: `https://3b09af3c-f605-44fe-8597-73a8f24d40cc-00-2xkffllmc9j6n.kirk.replit.dev`
   - Demo API Key: `dev-api-key` (for testing)

3. **Configure Extension**
   - Click the extension icon in your toolbar
   - Click "Settings" (gear icon) to open the options page
   - Enter your app URL in the "App URL" field
   - Enter `dev-api-key` in the "API Key" field
   - Click "Test Connection" to verify it works
   - Click "Save Connection" if the test passes

## Using the Extension

4. **Add Subscriptions**
   - Click the extension icon
   - Click "Add Subscription" 
   - Fill in the service name, cost, and other details
   - Click "Save" to add it to your tracker

5. **Auto-Detection**
   - Visit subscription websites like Netflix, Spotify, etc.
   - The extension will detect these services and offer to add them
   - Click "Add to Tracker" when prompted

6. **Sync & Manage**
   - Click "Sync Now" to refresh data
   - View your subscription totals and active count
   - Click "View All" to open the full web app

## Features

- ✅ **Quick Add**: Add subscriptions directly from your browser
- ✅ **Auto-Detection**: Detects subscription services on websites
- ✅ **Real-time Sync**: Keeps data synchronized with your web app
- ✅ **Smart Notifications**: Reminds you of upcoming renewals
- ✅ **Background Sync**: Updates data automatically
- ✅ **Comprehensive Settings**: Full configuration options

## Troubleshooting

**Can't add subscriptions?**
- Make sure you're using the correct API URL and key
- Test the connection in settings first
- Check that the web app is running

**Not detecting services?**
- Make sure auto-detection is enabled in settings
- Refresh the page after visiting subscription sites
- Check that content scripts are allowed to run

**Sync issues?**
- Verify your internet connection
- Check API credentials in settings
- Try clicking "Sync Now" manually

## Security

- API keys are stored securely using Chrome's sync storage
- All communications use HTTPS
- No sensitive data is logged or shared with third parties