# IoT Signage Client - Android/Fire TV App

A digital signage client application for Fire TV, Android TV, and Android devices that connects to the IoT Signage Manager server.

## Features

- 🔐 **Secure Authentication** - Login with email/password, device is registered to company account
- 📺 **Multi-format Playback** - Images, videos, web pages, YouTube, live streams
- 📊 **Real-time Metrics** - Reports CPU, memory, storage, network status every 30 seconds
- 🎮 **Remote Control** - Receive commands from server (reboot, refresh, volume, etc.)
- 🔄 **Auto-start** - Automatically starts on device boot
- 🌙 **Kiosk Mode** - Full-screen, immersive playback optimized for signage

## Requirements

- Android 5.1+ (API 22+) or Fire OS 5+
- Network connectivity to server
- Android Studio Arctic Fox+ for building

## Project Structure

```
android-client/
├── app/
│   ├── src/main/
│   │   ├── java/com/iotsignage/client/
│   │   │   ├── data/
│   │   │   │   ├── api/           # Retrofit API interfaces
│   │   │   │   ├── model/         # Data models
│   │   │   │   └── repository/    # Data repositories
│   │   │   ├── service/           # Background services
│   │   │   ├── ui/                # Activities & ViewModels
│   │   │   │   ├── login/
│   │   │   │   ├── player/
│   │   │   │   └── settings/
│   │   │   └── util/              # Utilities
│   │   └── res/                   # Resources
│   └── build.gradle
├── build.gradle
└── settings.gradle
```

## Building the App

### 1. Configure Server URL

Edit `app/build.gradle` and update the API_BASE_URL:

```gradle
buildConfigField "String", "API_BASE_URL", '"http://YOUR_SERVER_IP/api"'
```

Or use product flavors:
- `devDebug` - Development server
- `prodRelease` - Production server

### 2. Build APK

```bash
# Debug build
./gradlew assembleDevDebug

# Release build
./gradlew assembleProdRelease
```

APK will be at: `app/build/outputs/apk/`

### 3. Install on Fire TV

```bash
# Enable ADB on Fire TV first (Settings > My Fire TV > Developer Options)

# Connect to Fire TV
adb connect FIRE_TV_IP:5555

# Install APK
adb install app/build/outputs/apk/dev/debug/app-dev-debug.apk
```

## Usage

### First Launch

1. App opens to login screen
2. Enter your email and password (from the web dashboard)
3. Device registers with your company account
4. Playlist starts playing automatically

### Remote Control

Press **Menu** button twice quickly to open Settings.

| Remote Button | Action |
|---------------|--------|
| ► (Right) | Skip to next content |
| ◄ (Left) | Go to previous content |
| Play/Pause | Refresh playlist |
| Menu (x2) | Open settings |

### Server Commands

The server can send these commands remotely:

| Command | Description |
|---------|-------------|
| `REBOOT` | Reboot the device |
| `REFRESH_PLAYLIST` | Reload playlist |
| `SCREENSHOT` | Capture screen |
| `SET_VOLUME` | Adjust volume (0-100) |
| `SET_BRIGHTNESS` | Adjust brightness |
| `DISPLAY_MESSAGE` | Show overlay message |
| `CLEAR_CACHE` | Clear app cache |

## API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/device/auth/login` | POST | Device authentication |
| `/api/device/auth/refresh` | POST | Refresh token |
| `/api/device/heartbeat` | POST | Status + metrics |
| `/api/device/playlist` | GET | Get assigned playlist |
| `/api/device/settings` | GET | Get device settings |
| `/api/device/command/:id/ack` | POST | Acknowledge command |
| `/api/device/command/:id/complete` | POST | Report command result |
| `/api/device/event` | POST | Send device event |
| `/api/device/playback` | POST | Log playback activity |

## Metrics Reported

Every 30 seconds (configurable), the device reports:

- CPU usage %
- Memory usage (total, available)
- Storage usage (total, available)
- CPU temperature (if available)
- Network type (WiFi, Ethernet, etc.)
- WiFi signal strength
- Display state (on/off)
- Screen brightness
- Volume level
- Battery level (if applicable)
- Current playback state

## Troubleshooting

### App won't connect
- Verify server URL is correct
- Check network connectivity
- Ensure server is running and accessible
- Check if cleartext traffic is allowed (http vs https)

### Login fails
- Verify email/password are correct
- Check if user is associated with a company
- Verify company is active

### Playlist doesn't play
- Check if device has an assigned playlist
- Verify content URLs are accessible
- Check device logs in settings

### Device goes offline
- Check WiFi connection
- Verify heartbeat interval setting
- Check if token has expired

## Development

### Running locally

1. Clone the repository
2. Open in Android Studio
3. Sync Gradle
4. Update `API_BASE_URL` in build.gradle
5. Run on device/emulator

### Debugging

Enable verbose logging in debug builds:
```kotlin
Timber.plant(Timber.DebugTree())
```

View logs:
```bash
adb logcat | grep -i iotsignage
```

## License

Proprietary - Internal use only
