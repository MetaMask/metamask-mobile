# MetaMask Mobile Project Setup

**Goal**: Set up the MetaMask Mobile development environment for iOS, Android, or both platforms.

## First: Ask the User

**Before proceeding, ask the user:**

> Which environment would you like to set up?
>
> 1. **iOS** - Native iOS development
> 2. **Android** - Native Android development
> 3. **Both** - Full native development for iOS and Android
> 4. **Expo only** - JavaScript-only development (fastest setup, no native builds)

Wait for the user's response before proceeding with the relevant setup steps.

---

## Prerequisites Check (All Platforms)

### Step 1: Verify common prerequisites

Run these checks for all setup types:

```bash
# Check if Homebrew is installed
brew --version

# Check Node.js version (should be 20.18.0 or compatible)
node --version

# Check if watchman is installed
watchman --version

# Check Yarn version (should be 4.10.3)
yarn --version
```

**If missing, guide the user:**

- **Homebrew**: `Visit https://brew.sh and follow installation instructions`
- **Node.js**: `Install nvm or nodenv, then: nvm install 20.18.0` or `nodenv install 20.18.0`
- **Watchman**: `brew install watchman`
- **Yarn**: The project bundles Yarn 4.10.3, but ensure corepack is enabled: `corepack enable`

---

## iOS-Specific Prerequisites (Options 1 or 3)

### Step 2a: Verify iOS prerequisites

```bash
# Check Xcode installation
xcodebuild -version

# Check Ruby version (should be 3.1.6)
ruby --version

# Check if bundler is installed
bundle --version

# List available iOS simulators
xcrun simctl list devices available
```

**If missing or incorrect:**

- **Xcode**: Install from Mac App Store, then open and accept license
- **Xcode CLI Tools**: `xcode-select --install`
- **Ruby 3.1.6**: Install rbenv (`brew install rbenv`), then `rbenv install 3.1.6`
- **Bundler**: `gem install bundler -v 2.5.8`
- **applesimutils**: `brew tap wix/brew && brew install applesimutils`

---

## Android-Specific Prerequisites (Options 2 or 3)

### Step 2b: Verify Android prerequisites

```bash
# Check JAVA_HOME is set
echo $JAVA_HOME

# Check Android SDK location
echo $ANDROID_HOME

# Check if adb is available
adb --version
```

**If missing or incorrect:**

- **Android Studio**: Download from https://developer.android.com/studio
- **JAVA_HOME**: Add to shell config: `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
- **ANDROID_HOME**: Add to shell config: `export ANDROID_HOME="$HOME/Library/Android/sdk"`
- **PATH**: Add to shell config: `export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"`
- **NDK 26.1.10909125**: Install via Android Studio > Settings > SDK Tools
- **CMake 3.22.1**: Install via Android Studio > Settings > SDK Tools

---

## Environment File Setup

### Step 3: Check for .js.env file

```bash
# Check if .js.env exists
ls -la .js.env
```

**If missing:**

- **Internal Contributors**: Get `.js.env` from 1Password vault
- **External Contributors**:
  1. Copy the example file: `cp .js.env.example .js.env`
  2. Get an API key from https://developer.metamask.io
  3. Add API key to `MM_INFURA_PROJECT_ID` in `.js.env`

---

## Run Setup

### Step 4: Run the appropriate setup command

**Based on user's choice:**

#### Option 1: iOS Only

```bash
yarn setup
```

#### Option 2: Android Only

```bash
yarn setup
```

#### Option 3: Both iOS and Android

```bash
yarn setup
```

#### Option 4: Expo Only

```bash
yarn setup:expo
```

**Note**: The full `yarn setup` command runs dependency installation, iOS pod install, and prepares both platforms. This may take 10-20 minutes.

---

## Verification

### Step 5: Verify the installation

#### For iOS (Options 1, 3, or 4):

```bash
# Verify iOS pods are installed
ls ios/Pods

# Check that the workspace exists
ls ios/MetaMask.xcworkspace
```

#### For Android (Options 2 or 3):

```bash
# Verify Android build files exist
ls android/app/build.gradle

# Verify local.properties exists (created during setup)
ls android/local.properties
```

#### For all options:

```bash
# Verify node_modules installed correctly
ls node_modules/.yarn-state.yml

# Try to start the Metro bundler (runs briefly to test)
timeout 10 yarn watch || echo "Metro bundler started successfully"
```

### Step 6: Test running the app

**For iOS:**

```bash
# Build and run on iOS simulator
yarn start:ios
```

**For Android:**

```bash
# Build and run on Android emulator (ensure emulator is running)
yarn start:android
```

**For Expo:**

```bash
# Start the bundler
yarn watch
# Then press 'i' for iOS simulator or 'a' for Android emulator
```

---

## Checklist

- [ ] User selected target platform(s)
- [ ] Homebrew installed
- [ ] Node.js 20.18.0 installed
- [ ] Watchman installed
- [ ] Yarn 4.10.3 available
- [ ] (iOS) Xcode and CLI tools installed
- [ ] (iOS) Ruby 3.1.6 installed
- [ ] (iOS) Bundler installed
- [ ] (iOS) Simulators available
- [ ] (Android) Android Studio installed
- [ ] (Android) JAVA_HOME configured
- [ ] (Android) ANDROID_HOME configured
- [ ] (Android) NDK and CMake installed
- [ ] .js.env file configured
- [ ] Setup command completed
- [ ] Installation verified
- [ ] App builds and runs

---

## Troubleshooting

| Issue                                                     | Solution                                                  |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `node: command not found`                                 | Install Node.js via nvm or nodenv                         |
| `ruby version mismatch`                                   | Use rbenv: `rbenv install 3.1.6 && rbenv local 3.1.6`     |
| `pod install fails`                                       | Run `cd ios && bundle install && bundle exec pod install` |
| `No matching client found for package name 'io.metamask'` | Configure Firebase - see README.md Firebase section       |
| `Build fails on iOS`                                      | Run `yarn clean && yarn setup`                            |
| `Build fails on Android`                                  | Check JAVA_HOME and ANDROID_HOME are set correctly        |
| `Metro bundler crashes`                                   | Run `watchman watch-del-all && yarn start`                |
| `Simulator not found`                                     | Open Xcode > Settings > Platforms and install a simulator |
| `Android emulator not found`                              | Create one in Android Studio > Virtual Device Manager     |

---

## Quick Reference Commands

```bash
# Full setup (iOS + Android)
yarn setup

# Expo-only setup (fastest)
yarn setup:expo

# Clean and rebuild
yarn clean && yarn setup

# Start Metro bundler
yarn watch

# Run on iOS
yarn start:ios

# Run on Android
yarn start:android

# Run iOS unit tests
yarn test:unit:ios

# Run Android unit tests
yarn test:unit:android
```

---

## Success Criteria

- All prerequisite tools are installed and configured
- `yarn setup` (or `yarn setup:expo`) completes without errors
- Metro bundler starts successfully with `yarn watch`
- App builds and launches on the selected platform(s)
