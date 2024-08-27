# Debugging

The following tools are used for debugging the MetaMask mobile app:

- [Flipper](https://fbflipper.com/) - For general debugging on iOS and Android
  - [Redux Debugger](https://github.com/jk-gan/flipper-plugin-redux-debugger) - A plugin in Flipper for debugging Redux
- [Safari Browser](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Debugging.md#debugging-webview-contents) - For debugging the in-app browser for the mobile app
- [Google Chrome](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Debugging.md#debugging-webview-contents) - For debugging the in-app browser for the mobile app

## Flipper Setup

The prerequisite for debugging is to ensure that the mobile app is up and running:

- `yarn watch` - Start the metro bundler, which serves the JS bundle to the native app
- `yarn start:android` or `yarn start:ios`, which builds the app and installs it in the simulator

Run [Flipper](https://fbflipper.com/docs/getting-started/) using `yarn start:flipper` (verified working with v0.263.0)

- May be prompted to install Flipper for first time users
- Flipper app runs in the web browser

- If there are warnings on the `Troubleshoot` tab, follow the `Setup Doctor` to resolve all of the checks

Finally, check that the debugger is working:

- With the Flipper browser tab open, open your simulator alongside the Flipper app
- Flipper will auto-detect the device and the application to debug
- At this point, you should now be able to access features such as `Logs`

To enable Redux debugging: in Flipper, select the `More` tab -> `Plugin` and add [`redux-debugger`](https://github.com/jk-gan/flipper-plugin-redux-debugger)

- If the plugin is disabled, add or enable the plugin
- Once enabled, the plugin automatically picks up Redux actions, which can be used for debugging state changes

## Debugging the WebView (in-app browser)

### Android

- Run the app in debug mode (for example, in a simulator)
- Open Chrome on your desktop
- Go to `chrome://inspect/#devices`
- Look for the device and click inspect

### iOS

- Run the app in debug mode (for example, in a simulator)
- Make sure the value of `webviewDebuggingEnabled` prop on the Webview component is `true`
- Open Safari on your desktop
- Go to the menu Develop -> [Your device] -> [Website]

## Troubleshooting

- Flipper can't find watchman
  - Flipper expects watchman in the `user/local/bin` dir
  - Ex. If `watchman` was installed using `brew`, you may symlink `ln -s /opt/homebrew/bin/watchman /usr/local/bin/watchman`
- IDB binary not found
  - Flipper expects `idb` binary to exist in the path provided to it
  - First, ensure that [`idb`](https://github.com/facebook/idb?tab=readme-ov-file#idb-client) is installed
  - Then update the `idb` binary path in Flipper with the path returned by `which idb`
- Trouble installing `idb` with `pip3.6`
  - An alternative is to use [`pipx`](https://pipx.pypa.io/stable/) to install `idb`
  - Ensure that `pipx` path is added to your terminal's profile file using `pipx ensurepath`
- `Flipper` not detecting open simulator when `Flipper` is started
  - Try both refreshing the web page and the simulator
- Simulators not found and/or an error appearing under simulators showing command failed for `idb list-targets --json`
  - This is an open issue regarding M1 devices experiencing this issue
  - Try creating a symlink for `idb_companion` with `sudo ln -s /opt/homebrew/bin/idb_companion /usr/local/bin`
