# Debugging

The following tools are used for debugging the MetaMask mobile app:

- [Safari Browser](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Debugging.md#debugging-webview-contents) - For debugging the in-app browser for the mobile app
- [Google Chrome](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Debugging.md#debugging-webview-contents) - For debugging the in-app browser for the mobile app

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

- Trouble installing `idb` with `pip3.6`
  - An alternative is to use [`pipx`](https://pipx.pypa.io/stable/) to install `idb`
  - Ensure that `pipx` path is added to your terminal's profile file using `pipx ensurepath`
- Simulators not found and/or an error appearing under simulators showing command failed for `idb list-targets --json`
  - This is an open issue regarding M1 devices experiencing this issue
  - Try creating a symlink for `idb_companion` with `sudo ln -s /opt/homebrew/bin/idb_companion /usr/local/bin`
