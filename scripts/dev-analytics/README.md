# MetaMask Mobile Developer Analytics

A privacy-first analytics system for tracking developer command usage in the MetaMask Mobile project. This system allows team members to opt-in to sharing their development workflow patterns via Zapier webhooks.

## 🎯 Purpose

This analytics system helps the team understand:
- Which commands are used most frequently
- How long different build processes take
- Common development workflows and patterns
- System configurations and environments used by developers
- Build success/failure rates

## 🔐 Privacy & Consent

- **Opt-in only**: Analytics are completely disabled by default
- **Minimal data**: Only basic command and timing information is collected
- **No personal info**: System details, file paths, git info, and project paths are excluded
- **Top-level only**: Only tracks the yarn/npm command you actually type, not internal child processes
- **No duplication**: Prevents nested command tracking to avoid noise
- **Transparent**: All tracked data is clearly documented
- **Configurable**: Developers choose their own Zapier webhook destination
- **Reversible**: Can be easily disabled or completely removed

## 🚀 Quick Start

### 1. Set Up Analytics Tracking

First, wrap your npm scripts with analytics tracking:

```bash
node scripts/dev-analytics/setup-tracking.js setup
```

This will:
- Create a backup of your `package.json`
- Wrap selected npm scripts with analytics tracking
- Add analytics management commands

### 2. Get a Zapier Webhook URL

1. Go to [Zapier.com](https://zapier.com/)
2. Create a new Zap
3. Choose "Webhooks by Zapier" as the trigger
4. Select "Catch Hook"
5. Copy the webhook URL provided

### 3. Opt In to Analytics

```bash
yarn analytics:opt-in https://hooks.zapier.com/hooks/catch/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_SECRET/
```

### 4. Verify Setup

Test that everything is working:

```bash
yarn analytics:test
```

Check your Zapier dashboard to confirm the test event was received.

## 📋 Commands

### Analytics Management

| Command | Description |
|---------|-------------|
| `yarn analytics:opt-in <webhook-url>` | Opt in to analytics with your Zapier webhook |
| `yarn analytics:opt-out` | Opt out of analytics tracking |
| `yarn analytics:status` | Show current analytics configuration |
| `yarn analytics:test` | Send a test event to verify webhook setup |
| `yarn analytics:remove` | Remove analytics tracking from package.json |

### Direct CLI Usage

You can also use the CLI directly:

```bash
node scripts/dev-analytics/cli.js status
node scripts/dev-analytics/cli.js opt-in https://your-webhook-url/
node scripts/dev-analytics/cli.js opt-out
node scripts/dev-analytics/cli.js test
```

## 📊 Tracked Commands

The following npm scripts are automatically tracked when analytics are enabled:

**Setup & Configuration:**
- `setup`, `setup:flask`, `setup:expo`
- `pod:install`

**Development:**
- `start:ios`, `start:ios:qa`, `start:ios:e2e`, `start:ios:flask`
- `start:android`, `start:android:qa`, `start:android:e2e`, `start:android:flask`
- `watch`

**Building:**
- `build:android:release`, `build:ios:release`
- `build:android:qa`, `build:ios:qa`

**Testing:**
- `test`, `test:unit`
- `test:e2e:ios:build:qa-release`, `test:e2e:android:build:qa-release`

**Code Quality:**
- `lint`, `format`

**Maintenance:**
- `clean`

## 📈 Data Collected

### Command Execution Events

When you run a tracked command, the following minimal data is sent:

```json
{
  "event": "command_executed",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "userId": "unique-anonymous-id",
  "command": "yarn",
  "args": ["start:ios"],
  "fullCommand": "yarn start:ios",
  "environment": "development",
  "buildType": "main",
  "buildEnvironment": "local",
  "wrappedExecution": true,
  "originalCommand": "yarn start:ios"
}
```

### Command Completion Events

When a command finishes:

```json
{
  "event": "command_completed",
  "timestamp": "2024-01-15T10:35:00.000Z",
  "userId": "unique-anonymous-id",
  "command": "yarn",
  "args": ["start:ios"],
  "fullCommand": "yarn start:ios",
  "duration": 300000,
  "exitCode": 0,
  "success": true,
  "wrappedExecution": true,
  "originalCommand": "yarn start:ios"
}
```

### Smart Command Tracking

The system intelligently tracks only the top-level command you actually type:

- **What you type**: `yarn start:ios`
- **What gets tracked**: `yarn start:ios` ✅
- **What doesn't get tracked**: Internal `yarn clean`, child processes, etc. ❌

This prevents duplicate events and noise from complex build scripts that call multiple sub-commands.

#### Advanced Deduplication

The system uses multiple mechanisms to prevent duplicate tracking:

1. **Environment Variables**: Marks child processes to skip tracking
2. **Lock Files**: Creates temporary files to prevent tracking across shell command chains (`&&`)
3. **Process Detection**: Uses parent process IDs to identify npm script boundaries
4. **Script Lifecycle**: Only tracks the original npm/yarn command that started the script

Example with a complex script:
```bash
# package.json script:
"setup:expo": "yarn clean && node setup.mjs --no-build-ios"

# When you run: yarn setup:expo
# ✅ Tracks: yarn setup:expo (once)
# ❌ Skips: yarn clean, node setup.mjs (deduplication works!)
```

## 🔧 Configuration

### Configuration File

Settings are stored in: `~/.metamask-mobile-dev-analytics/config.json`

```json
{
  "optedIn": true,
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "zapierWebhookUrl": "https://hooks.zapier.com/hooks/catch/...",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

### Environment Variables

The system respects these environment variables:

- `METAMASK_BUILD_TYPE`: Build type (main, flask, etc.)
- `METAMASK_ENVIRONMENT`: Environment (production, local, etc.)
- `NODE_ENV`: Node environment

## 🛠️ Advanced Usage

### Manual Command Wrapping

You can manually wrap any command with analytics:

```bash
node scripts/dev-analytics/command-wrapper.js your-command --with-args
```

### Custom Event Tracking

For custom analytics events in your own scripts:

```javascript
const { trackEvent } = require('./scripts/dev-analytics/tracker');

await trackEvent('custom_event', {
  action: 'file_processed',
  fileCount: 42,
  duration: 1500
});
```

## 🔄 Removing Analytics

To completely remove analytics tracking:

```bash
yarn analytics:remove
```

This will:
- Restore original npm scripts
- Remove analytics management commands
- Keep your opt-in preferences intact (in case you want to re-enable later)

## 🎛️ Zapier Integration

### Recommended Zapier Setup

1. **Trigger**: Webhooks by Zapier - Catch Hook
2. **Action Options**:
   - **Google Sheets**: Log to a spreadsheet for analysis
   - **Slack**: Notify team channel of build events  
   - **Database**: Store in Airtable, PostgreSQL, etc.
   - **Analytics**: Send to Mixpanel, Amplitude, etc.

### Sample Zapier Filters

You can filter events in Zapier:

```javascript
// Only track iOS builds
return inputData.fullCommand.includes('ios');

// Only track failed commands
return inputData.exitCode !== 0;

// Only track long-running commands (>5 minutes)
return inputData.duration > 300000;
```

## 🐛 Troubleshooting

### Analytics Not Working

1. Check your status:
   ```bash
   yarn analytics:status
   ```

2. Verify webhook URL is correct:
   ```bash
   yarn analytics:test
   ```

3. Check Zapier webhook logs for errors

### Commands Not Being Tracked

1. Verify the command is in the tracked list (see "Tracked Commands" section)
2. Check that analytics setup completed successfully:
   ```bash
   grep "command-wrapper" package.json
   ```

### Webhook Timeouts

If webhooks are timing out:
- Check your internet connection
- Verify the Zapier webhook URL is correct
- Try the test command to isolate issues

## 📝 Development

### Project Structure

```
scripts/dev-analytics/
├── README.md              # This file
├── cli.js                 # CLI for managing analytics
├── command-wrapper.js     # Wraps commands with analytics
├── config.js              # Configuration management
├── setup-tracking.js      # Sets up package.json modifications
└── tracker.js             # Core analytics tracking logic
```

### Adding New Tracked Commands

Edit `COMMANDS_TO_TRACK` in `setup-tracking.js`:

```javascript
const COMMANDS_TO_TRACK = [
  'setup',
  'your-new-command',  // Add here
  // ... existing commands
];
```

Then run:
```bash
node scripts/dev-analytics/setup-tracking.js setup
```

## 🤝 Contributing

When contributing to the analytics system:

1. Ensure all changes are opt-in only
2. Document any new data collection
3. Test both opted-in and opted-out scenarios
4. Update this README with any new features

## 📜 License

This analytics system is part of the MetaMask Mobile project and follows the same license terms. 