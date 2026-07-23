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
 *
 * `openSupportWithConsent` accepts an optional `onOpenSupport` callback fired
 * once the support URL has successfully opened (after confirm or reject;
 * never on dismiss, and never if the opener throws), so a call site can
 * record its "support opened" analytics event at the moment support is
 * actually opened rather than when the user merely taps confirm/reject.
 */
export const useSupportConsent = () => {
  const navigation = useNavigation();

  const openSupportWithConsent = useCallback(
    (open: OpenSupportUrl, baseUrl?: string, onOpenSupport?: () => void) => {
      navigateToSupportConsent(navigation, open, baseUrl, onOpenSupport);
    },
    [navigation],
  );

  return { openSupportWithConsent };
};
