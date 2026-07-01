import InAppBrowser from 'react-native-inappbrowser-reborn';

interface WebviewNavigation {
  navigate: (name: string, params: object) => void;
}

/**
 * Opens a URL in the native in-app browser (SFSafariViewController / Chrome
 * Custom Tabs). Falls back to the embedded SimpleWebview when unavailable.
 */
export async function openUrlWithInAppBrowser(
  url: string,
  navigation: WebviewNavigation,
  title?: string,
): Promise<void> {
  if (await InAppBrowser.isAvailable()) {
    await InAppBrowser.open(url);
    return;
  }

  navigation.navigate('Webview', {
    screen: 'SimpleWebview',
    params: title ? { url, title } : { url },
  });
}
