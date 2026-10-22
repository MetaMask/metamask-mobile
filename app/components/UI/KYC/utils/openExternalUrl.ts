import { Linking } from 'react-native';

/**
 * Opens a URL in the system browser. A failed open is ignored so the user
 * can simply tap the link again.
 */
export const openExternalUrl = (url: string) => {
  Linking.openURL(url).catch(() => undefined);
};
