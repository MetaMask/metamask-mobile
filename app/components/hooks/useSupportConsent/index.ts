import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
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
 * If the user saved their choice ("Save my preference"), the sheet is skipped
 * and the saved choice is applied directly (see `navigateToSupportConsent`).
 *
 * `openSupportWithConsent` accepts an optional `onOpenSupport` callback fired
 * once the support URL has successfully opened (after confirm or reject;
 * never on dismiss, and never if the opener throws), so a call site can
 * record its "support opened" analytics event at the moment support is
 * actually opened rather than when the user merely taps confirm/reject.
 */
export const useSupportConsent = () => {
  const navigation = useNavigation<AppNavigationProp>();

  const openSupportWithConsent = useCallback(
    (open: OpenSupportUrl, baseUrl?: string, onOpenSupport?: () => void) => {
      navigateToSupportConsent(navigation, open, baseUrl, onOpenSupport);
    },
    [navigation],
  );

  return { openSupportWithConsent };
};
