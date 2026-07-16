import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  navigateToSupportConsent,
  OpenSupportUrl,
} from '../../../util/support';

export type { OpenSupportUrl };

/**
 * Shows the support consent sheet, then opens the support URL via the
 * caller-provided `open` function (e.g. navigating to SimpleWebview,
 * `Linking.openURL`, or an in-app browser), keeping each entry point's
 * existing opening mechanism intact.
 *
 * The consent choice is not persisted: the sheet is shown on every call,
 * matching the extension's behavior (see extension PR #44482).
 */
export const useSupportConsent = () => {
  const navigation = useNavigation();

  const openSupportWithConsent = useCallback(
    (open: OpenSupportUrl, baseUrl?: string) => {
      navigateToSupportConsent(navigation, open, baseUrl);
    },
    [navigation],
  );

  return { openSupportWithConsent };
};
