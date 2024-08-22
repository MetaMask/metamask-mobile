### Debugging

First, make sure you have the following running:

- `yarn watch`
- Your Android emulator or iOS simulator
- `yarn start:android` or `yarn start:ios`

Next, install the [Flipper](https://fbflipper.com/) desktop app (verified working with v0.127.0)

- Once Flipper is installed, configure your system as follows:
  - Install react-devtools: `npm i -g react-devtools@4.22.1`
  - Update Android SDK location settings by accessing Flipper's settings via the `Gear Icon` -> `Settings`
    - Example SDK path: `/Users/<USER_NAME>/Library/Android/sdk`

Finally, check that the debugger is working:

- Open your emulator or simulator alongside the Flipper app
- Flipper should auto-detect the device and the application to debug
- You should now be able to access features such as `Logs`

#### Debugging Physical iOS devices

- Debugging physical iOS devices requires `idb` to be installed, which consists of 2 parts
- Install the two idb parts:
  1. `brew tap facebook/fb` & `brew install idb-companion`
  2. `pip3.9 install fb-idb` (This step may require that you install python3 via `python -m pip3 install --upgrade pip`)

#### Debug a website inside the WebView (in-app browser)

Android

- Run the app in debug mode (for example, in a simulator)
- Open Chrome on your desktop
- Go to `chrome://inspect/#devices`
- Look for the device and click inspect

iOS

- Run the app in debug mode (for example, in a simulator)
- Make sure the value of `webviewDebuggingEnabled` prop on the Webview component is `true`
- Open Safari on your desktop
- Go to the menu Develop -> [Your device] -> [Website]

You should see the console for the website that is running inside the WebView
