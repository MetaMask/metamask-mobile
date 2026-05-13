# MetaMask Mobile Project Setup

**Goal**: Guide the user through setting up their development environment interactively.

## Step 1: Ask the User

**Before proceeding, ask:**

> Which development environment would you like to set up?
>
> 1. **Expo** (recommended) - JavaScript-only development, fastest setup
> 2. **iOS Native** - Required for native iOS code changes
> 3. **Android Native** - Required for native Android code changes
> 4. **Full Native (iOS + Android)** - Complete native development setup

Wait for the user's response before proceeding.

---

## Step 2: Guide Based on Selection

### Option 1: Expo Development

**Documentation**: [Expo Environment Setup](./docs/readme/expo-environment.md)

1. Walk the user through the Expo environment prerequisites from the docs
2. Help them configure `.js.env` (see [README.md - Infura Setup](./README.md#infura-project-setup))
3. Run setup:
   ```bash
   yarn setup:expo
   ```
4. Help them download the development build from the [Runway buckets](./README.md#download-and-install-the-development-build)
5. Start the bundler:
   ```bash
   yarn watch
   ```

### Option 2: iOS Native Development

**Documentation**: [Native Environment Setup](./docs/readme/environment.md#ios)

1. Walk the user through the iOS prerequisites from the docs
2. Help them configure `.js.env` and Firebase (see [README.md - Firebase Setup](./README.md#firebase-messaging-setup))
3. Run setup:
   ```bash
   yarn setup
   ```
4. Start development:
   ```bash
   yarn watch        # Terminal 1
   yarn start:ios    # Terminal 2
   ```

### Option 3: Android Native Development

**Documentation**: [Native Environment Setup](./docs/readme/environment.md#android)

1. Walk the user through the Android prerequisites from the docs
2. Help them configure `.js.env` and Firebase (see [README.md - Firebase Setup](./README.md#firebase-messaging-setup))
3. Run setup:
   ```bash
   yarn setup
   ```
4. Start development:
   ```bash
   yarn watch          # Terminal 1
   yarn start:android  # Terminal 2
   ```

### Option 4: Full Native Development

**Documentation**: [Native Environment Setup](./docs/readme/environment.md)

1. Walk the user through both iOS and Android prerequisites from the docs
2. Help them configure `.js.env` and Firebase (see [README.md - Firebase Setup](./README.md#firebase-messaging-setup))
3. Run setup:
   ```bash
   yarn setup
   ```
4. Start development on their preferred platform

---

## Step 3: Verify Installation

After setup completes, verify by running:

```bash
yarn watch
```

If successful, the Metro bundler should start without errors.

---

## Troubleshooting

If the user encounters issues, refer them to:

- [Build Troubleshooting](./docs/readme/troubleshooting.md)
- [README.md](./README.md) for Firebase and Infura configuration
- Common issues:
  - Missing `.js.env` → Copy from `.js.env.example` and add Infura key
  - Firebase errors → Ensure `google-services.json` / `GoogleService-Info.plist` are configured
  - Pod install fails → `cd ios && bundle install && bundle exec pod install`
  - Android build fails → Verify `JAVA_HOME` and `ANDROID_HOME` are set

---

## Quick Reference

| Setup Type    | Command                    | Documentation                                            |
| ------------- | -------------------------- | -------------------------------------------------------- |
| Expo          | `yarn setup:expo`          | [expo-environment.md](./docs/readme/expo-environment.md) |
| Native        | `yarn setup`               | [environment.md](./docs/readme/environment.md)           |
| Clean rebuild | `yarn clean && yarn setup` | -                                                        |
| Start bundler | `yarn watch`               | -                                                        |
| Run iOS       | `yarn start:ios`           | -                                                        |
| Run Android   | `yarn start:android`       | -                                                        |
