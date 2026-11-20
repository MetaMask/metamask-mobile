import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import type { BottomSheetRef } from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Logger from '../../../../util/Logger';

export interface UseOpenProviderSupportUrlParams {
  sheetRef: RefObject<BottomSheetRef | null>;
  logContext: string;
}

export interface OpenProviderSupportUrlOptions {
  /** Webview title, used when the in-app browser is unavailable. */
  title?: string;
  /** Called once per accepted press, before the URL is opened. Repeat presses ignored by the in-flight guard do not call it. */
  onOpen?: () => void;
}

/**
 * Opens a provider support URL from inside a Ramp bottom sheet.
 *
 * The in-app browser is presented over the still-mounted sheet, and the sheet
 * is closed only after the browser is dismissed. On iOS the browser is
 * presented from the topmost modal, so closing the sheet first would dismiss
 * the browser along with the modal.
 *
 * `InAppBrowser.open` only settles when the user dismisses the browser. If the
 * browser is closed some other way (for example by the app lock), the promise
 * never settles, so the in-flight guard is also cleared when the app returns
 * to the foreground.
 */
export function useOpenProviderSupportUrl({
  sheetRef,
  logContext,
}: UseOpenProviderSupportUrlParams): (
  url: string,
  options?: OpenProviderSupportUrlOptions,
) => Promise<void> {
  const navigation = useNavigation<AppNavigationProp>();
  const activeCallRef = useRef<symbol | null>(null);

  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (previousState !== 'active' && nextState === 'active') {
        activeCallRef.current = null;
      }
      previousState = nextState;
    });
    return () => subscription.remove();
  }, []);

  return useCallback(
    async (
      url: string,
      { title, onOpen }: OpenProviderSupportUrlOptions = {},
    ) => {
      if (activeCallRef.current) return;
      const call = Symbol('openProviderSupportUrl');
      activeCallRef.current = call;
      onOpen?.();
      try {
        if (await InAppBrowser.isAvailable()) {
          try {
            await InAppBrowser.open(url);
          } finally {
            sheetRef.current?.onCloseBottomSheet();
          }
        } else {
          // Navigate without closing the sheet first. The Webview is presented
          // above the sheet's modal, so dismissing the modal would dismiss it too.
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
        if (activeCallRef.current === call) {
          activeCallRef.current = null;
        }
      }
    },
    [sheetRef, logContext, navigation],
  );
}
