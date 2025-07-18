# Expo E2E Testing

This guide will help you set up and run end-to-end (E2E) tests using the Expo builds on both iOS and Android.

## Prerequisites

### Environment Setup

1. Copy the E2E environment variables from the example file:

   ```bash
   cp .e2e.env.example .e2e.env
   ```

2. Ensure your `.e2e.env` file contains the following prebuild paths:

   ```bash
   # E2E prebuild paths
   # These paths point to a gitignored root build folder, so you may need to create this folder.
   export PREBUILT_IOS_APP_PATH='build/MetaMask.app'
   export PREBUILT_ANDROID_APK_PATH='build/MetaMask.apk'
   export PREBUILT_ANDROID_TEST_APK_PATH='build/MetaMask-Test.apk'
   ```

3. Create the build directory if it doesn't exist:

   ```bash
   # In root of project
   mkdir build
   ```

4. Install dependencies

   ```bash
   # In root of project
   yarn setup:expo
   ```

### iOS Prerequisites

- **Required Simulator**: iPhone 15 Pro
- **Setup Instructions**:
  1. Open Xcode
  2. Go to **Window** → **Devices and Simulators**
  3. Click the **+** button to add a new simulator
  4. Select **iPhone 15 Pro** and create the simulator

### Android Prerequisites

- **Set up Android SDK path** by adding this to your shell profile (`.bashrc`, `.zshrc`, etc.):

  ```bash
  export ANDROID_SDK_ROOT="/Users/${USER}/Library/Android/sdk"
  ```

- **Required Emulator**: "Pixel 5 Pro API 34"
  - Open Android Studio
  - Go to **Tools** → **AVD Manager**
  - Click **Create Virtual Device**
  - Select a Pixel device (or similar)
  - Choose API level 34
  - **Important**: Name the emulator exactly "Pixel 5 Pro API 34" to match our configuration

## iOS Testing Steps

1. **Verify prerequisites** are completed (Environment Setup + iOS Prerequisites)

2. **Download iOS simulator builds** from Runway/Bitrise

3. **Copy and rename the build**: Copy your downloaded .app file to the prebuild path

   ```bash
   # Copy your downloaded .app file to the prebuild path
   cp /path/to/your/downloaded/AAA.app build/MetaMask.app
   ```

4. **Start the E2E watcher**:

   ```bash
   source .e2e.env && yarn watch
   ```

5. **Launch the iPhone 15 Pro simulator** from Xcode or using:

   ```bash
   xcrun simctl boot "iPhone 15 Pro"
   ```

6. **Run the E2E tests**:

   ```bash
   # Run all tests
   source .e2e.env && yarn test:e2e:ios:debug:run

   # Run specific folder
   source .e2e.env && yarn test:e2e:ios:debug:run e2e/specs/your-folder

   # Run specific test file
   source .e2e.env && yarn test:e2e:ios:debug:run e2e/specs/your-test-file.spec.ts

   # Run specific tag
   source .e2e.env && yarn test:e2e:ios:debug:run --testNamePattern="Smoke"
   ```

## Android Testing Steps

1. **Verify prerequisites** are completed (Environment Setup + Android Prerequisites)

2. **Download Android builds** from Runway/Bitrise

   > ⚠️ **Important**: You need **both APK files** from the downloaded zip:
   >
   > - Main APK from `/prod/debug/` folder
   > - Test APK from `/androidTest/` folder

3. **Install the builds**:

   ```bash
   # Copy the main APK (from /prod/debug/ folder)
   cp /path/to/downloaded/prod/debug/AAA.apk build/MetaMask.apk

   # Copy the test APK (from /androidTest/ folder)
   cp /path/to/downloaded/androidTest/prod/debug/BBB.apk build/MetaMask-Test.apk
   ```

4. **Start the E2E watcher**:

   ```bash
   source .e2e.env && yarn watch
   ```

5. **Launch the Android emulator**: through Android Studio

6. **Run the E2E tests**:

   ```bash
   # Run all tests
   source .e2e.env && yarn test:e2e:android:debug:run

   # Run specific folder
   source .e2e.env && yarn test:e2e:android:debug:run e2e/specs/your-folder

   # Run specific test file
   source .e2e.env && yarn test:e2e:android:debug:run e2e/specs/your-test-file.spec.ts

   # Run specific tag
   source .e2e.env && yarn test:e2e:android:debug:run --testNamePattern="Smoke"
   ```

## Troubleshooting

### Common Issues

- **The application is not opening**: EXPO DOESN'T SUPPORT DETOX OUT OF THE BOX SO IT IS POSSIBLE THAT, IN SLOWER COMPUTERS, LOADING FROM THE BUNDLER TAKES TOO LONG WHICH MAKES THE VERY FIRST TEST FAIL. THE FAILED TEST WILL THEN AUTOMATICALLY RESTART AND IT SHOULD WORK FROM THEN ON.
- **Build folder doesn't exist**: Run `mkdir build` in your project root
- **Simulator/Emulator not found**: Ensure the device names match exactly as specified in prerequisites
- **Android SDK not found**: Verify `$ANDROID_SDK_ROOT` is set correctly with `echo $ANDROID_SDK_ROOT`
- **My Expo Application shows an error "Failed to connect to localhost/127.0.0.1:8081"**: The emulator may need to have the expo port forwarded. Try `adb reverse tcp:8081 tcp:8081` and rerun the test command.
