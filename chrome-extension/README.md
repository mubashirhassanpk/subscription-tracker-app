# Subscription Tracker Chrome Extension

A Chrome extension that synchronizes with your Subscription Tracker web application to manage subscriptions directly from your browser.

## Features

- **Popup Interface**: Quick access to your subscription dashboard
- **Auto-Detection**: Automatically detects subscription services on websites
- **Real-time Sync**: Syncs data with your web application API
- **Background Sync**: Keeps data updated in the background
- **Smart Notifications**: Reminds you of upcoming renewals
- **Settings Page**: Configure API connection and preferences
- **Content Scripts**: Detect and suggest subscriptions on known sites

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension will be loaded and ready to use

## Setup

1. Click the extension icon in your browser toolbar
2. Configure your Subscription Tracker app URL and API key
3. Test the connection to ensure everything is working
4. The extension will automatically sync your subscriptions

## File Structure

```
chrome-extension/
├── manifest.json              # Extension configuration
├── assets/                    # Icons and static files
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                     # Extension popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/                # Background service worker
│   └── background.js
├── content/                   # Content scripts
│   ├── content.js
│   └── content.css
└── options/                   # Settings page
    ├── options.html
    ├── options.css
    └── options.js
```

## API Integration

The extension connects to your Subscription Tracker web application using:

- **API URL**: Your app's base URL (e.g., `https://your-app.replit.dev`)
- **API Key**: Authentication key from your app settings
- **Endpoints**: Uses the same REST API as the web application

### Supported API Endpoints

- `GET /api/subscriptions` - Fetch all subscriptions
- `POST /api/subscriptions` - Add new subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `DELETE /api/subscriptions/:id` - Delete subscription

## Permissions

The extension requires the following permissions:

- **storage**: Save settings and cache data
- **activeTab**: Access current webpage for subscription detection
- **background**: Run background sync service
- **notifications**: Show renewal reminders
- **alarms**: Schedule periodic syncs
- **host_permissions**: Access your app's domain for API calls

## Supported Subscription Services

The extension can automatically detect these services:

- Netflix
- Spotify
- Adobe Creative Cloud
- Microsoft 365
- Google Workspace
- Apple iCloud+
- Amazon Prime
- YouTube Premium
- Hulu
- Disney+

## Security

- API keys are stored securely using Chrome's sync storage
- All API communications use HTTPS
- No sensitive data is logged or transmitted to third parties
- Local data is encrypted using Chrome's built-in security

## Development

To modify or extend the extension:

1. Make changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Test functionality in the popup and on websites
4. Check browser console for any errors

## Troubleshooting

**Connection Issues:**
- Verify your app URL is correct and accessible
- Check that your API key is valid
- Ensure your app's CORS settings allow the extension domain

**Sync Problems:**
- Check your internet connection
- Verify the API endpoints are responding
- Clear the extension's cache from the options page

**Detection Not Working:**
- Ensure content scripts are enabled
- Check that the website is in the supported services list
- Refresh the page after installation

## Version History

- **v1.0.0**: Initial release with full sync functionality
  - Popup interface for subscription management
  - Background sync with API
  - Auto-detection of subscription services
  - Renewal notifications
  - Comprehensive settings page