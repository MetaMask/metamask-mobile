### Debugging

First, make sure you have the following running:

- `yarn watch`
- Your Android emulator or iOS simulator
- `yarn start:android` or `yarn start:ios`

You now have access to React Native Debugger on your relative simulator or emulator. You can open it by pressing `Cmd + D` on iOS or `Cmd + M` on Android. You can also open it by running `yarn debug` in the terminal.

You will need an additional tool for Redux and network debugging.

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
- Open Safari on your desktop
- Go to the menu Develop -> [Your device] -> [Website]

You should see the console for the website that is running inside the WebView
