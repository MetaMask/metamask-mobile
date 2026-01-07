# Fastlane TestFlight Quick Start Guide

## Setup (One-time)

1. **Install dependencies**:
   ```bash
   cd ios
   bundle install
   ```

2. **Configure authentication**:

   **App Store Connect API Key** (Required):
   
   For local testing, create a `.env.local` file:
   ```bash
   cd ios/fastlane
   cp env.local.example .env.local
   # Edit .env.local with your actual API key values
   ```
   
   Then source it before running Fastlane:
   ```bash
   source ios/fastlane/.env.local
   cd ios
   bundle exec fastlane list_testflight_groups
   ```
   
   **Note**: `.env.local` is gitignored - your API keys will never be committed.

## Quick Commands

### Upload Main App to External TestFlight Group
```bash
cd ios
bundle exec fastlane testflight_main groups:"['Your Group Name']" notify_external_testers:true
```

### List Available Groups
```bash
bundle exec fastlane list_testflight_groups
```

### Add Existing Build to Groups
```bash
bundle exec fastlane add_to_testflight_groups build_number:123 groups:"['Group Name']"
```

## Common Options

- `groups:"['Group 1', 'Group 2']"` - External TestFlight group names (required)
- `notify_external_testers:true` - Send email notifications
- `skip_waiting_for_build_processing:true` - Don't wait for processing
- `changelog:"Release notes here"` - Build release notes

## Example: Full Workflow

```bash
# 1. List available groups
bundle exec fastlane list_testflight_groups

# 2. Upload build to external groups
bundle exec fastlane testflight_main \
  groups:"['External Testers', 'Beta Testers']" \
  notify_external_testers:true \
  changelog:"Version 7.62.0 - New features and improvements"
```

## Troubleshooting

**"Group not found" error**: 
- Verify group name matches exactly (case-sensitive)
- Use `list_testflight_groups` to see available groups

**Authentication errors**:
- Check API key permissions in App Store Connect
- Verify environment variables are set correctly

**Build processing**:
- TestFlight builds take 10-30 minutes to process
- Use `skip_waiting_for_build_processing:true` to upload and exit

