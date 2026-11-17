import { useCallback, useRef, type RefObject } from 'react';
import { useNavigation } from '@react-navigation/native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Logger from '../../../../util/Logger';

export interface UseOpenProviderSupportUrlParams {
  sheetRef: RefObject<BottomSheetRef | null>;
  logContext: string;
}

/**
 * Opens a provider support URL from inside a Ramp bottom sheet.
 *
 * The in-app browser is presented over the still-mounted sheet, and the sheet
 * is closed only after the browser is dismissed. On iOS the browser is
 * presented from the topmost modal, so closing the sheet first would dismiss
 * the browser along with the modal.
 */
export function useOpenProviderSupportUrl({
  sheetRef,
  logContext,
}: UseOpenProviderSupportUrlParams): (
  url: string,
  title?: string,
) => Promise<void> {
  const navigation = useNavigation<AppNavigationProp>();
  const isOpeningRef = useRef(false);

  return useCallback(
    async (url: string, title?: string) => {
      if (isOpeningRef.current) return;
      isOpeningRef.current = true;
      try {
        if (await InAppBrowser.isAvailable()) {
          try {
            await InAppBrowser.open(url);
          } finally {
            sheetRef.current?.onCloseBottomSheet();
          }
        } else {
          // Navigate without closing the sheet first. Closing it would call goBack
          // after the close animation and pop the Webview screen instead of the modal.
          navigation.navigate('Webview', {
            screen: 'SimpleWebview',
            params: { url, title },
          });
        }
      } catch (error) {
        Logger.error(
          error as Error,
          `${logContext}: Failed to open support URL`,
        );
      } finally {
        isOpeningRef.current = false;
      }
    },
    [sheetRef, logContext, navigation],
  );
}
