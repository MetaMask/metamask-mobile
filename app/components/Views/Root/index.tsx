import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { store, persistor } from '../../../store';
import App from '../../Nav/App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import Logger from '../../../util/Logger';
import ErrorBoundary from '../ErrorBoundary';
import ThemeProvider from '../../../component-library/providers/ThemeProvider/ThemeProvider';
import { ToastContextWrapper } from '../../../component-library/components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootProps } from './types';
import NavigationProvider from '../../Nav/NavigationProvider';
import ControllersGate from '../../Nav/ControllersGate';
import { isTest } from '../../../util/test/utils';
import { FeatureFlagOverrideProvider } from '../../../contexts/FeatureFlagOverrideContext';
import { ScreenOrientationService } from '../../../core/ScreenOrientation';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { SnapsExecutionWebView } from '../../../lib/snaps';
///: END:ONLY_INCLUDE_IF
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import reactQueryService from '../../../core/ReactQueryService';
import { HardwareWalletProvider } from '../../../core/HardwareWallet';
import notifee, { EventType } from '@notifee/react-native';
import { AppState } from 'react-native';
import { handleDeeplink } from '../../../core/DeeplinkManager/handlers/legacy/handleDeeplink';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import { AppStateEventProcessor } from '../../../core/AppStateEventListener';
import { PressActionId } from '../../../util/notifications/types';

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
const Root = ({ foxCode }: RootProps) => {
  const [isStoreLoading, setIsStoreLoading] = useState(true);

  /**
   * Wait for store to be initialized in Detox tests
   * Note: This is a workaround for an issue with Detox where the store is not initialized
   */
  const waitForStore = () =>
    new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (store && persistor) {
          clearInterval(intervalId);
          setIsStoreLoading(false);
          resolve(null);
        }
      }, 100);
    });

  useEffect(() => {
    if (foxCode === '') {
      const foxCodeError = new Error('WARN - foxCode is an empty string');
      Logger.error(foxCodeError);
    }
    SecureKeychain.init(foxCode);
    // Init EntryScriptWeb3 asynchronously on the background
    EntryScriptWeb3.init();
    // Lock screen orientation to portrait on app start
    ScreenOrientationService.lockToPortrait();
    // Wait for store to be initialized in Detox tests
    if (isTest) {
      waitForStore();
    } else {
      setIsStoreLoading(false);
    }
  }, [foxCode]);

  // Subscribe to Notifee foreground tap events for the agentic-CLI MFA flow.
  // No other foreground listener exists in the codebase today; this also
  // doubles as the foreground deeplink-routing fix called out in
  // docs/mfa-webview-poc.md.
  useEffect(() => {
    // eslint-disable-next-line no-console -- TEMP debug
    console.log('[Notifee:fg-subscribe] registering onForegroundEvent');
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      // eslint-disable-next-line no-console -- TEMP debug
      console.log(
        '[Notifee:fg-event]',
        JSON.stringify({
          type,
          eventName:
            type === EventType.PRESS
              ? 'PRESS'
              : type === EventType.DELIVERED
                ? 'DELIVERED'
                : type === EventType.DISMISSED
                  ? 'DISMISSED'
                  : 'OTHER',
          pressActionId: detail.pressAction?.id,
          notificationId: detail.notification?.id,
          hasDataStr: typeof detail.notification?.data?.dataStr,
          dataStr: detail.notification?.data?.dataStr,
        }),
      );
      if (type !== EventType.PRESS) return;
      if (detail.pressAction?.id !== PressActionId.OPEN_CLI_MFA) {
        // eslint-disable-next-line no-console -- TEMP debug
        console.log(
          '[Notifee:fg-event] press ignored — pressActionId mismatch:',
          detail.pressAction?.id,
          'expected:',
          PressActionId.OPEN_CLI_MFA,
        );
        return;
      }
      try {
        const dataStr = detail.notification?.data?.dataStr;
        const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : null;
        // eslint-disable-next-line no-console -- TEMP debug
        console.log(
          '[Notifee:fg-event] parsed data, deeplink=',
          data?.deeplink,
        );
        if (data && typeof data.deeplink === 'string') {
          // eslint-disable-next-line no-console -- TEMP debug
          console.log('[Notifee:fg-event] calling handleDeeplink');
          handleDeeplink({
            uri: data.deeplink,
            source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
          });
        } else {
          // eslint-disable-next-line no-console -- TEMP debug
          console.log('[Notifee:fg-event] no deeplink in data — skipping');
        }
      } catch (err) {
        // eslint-disable-next-line no-console -- TEMP debug
        console.log('[Notifee:fg-event] threw', err);
        Logger.error(
          err as Error,
          'Notifee foreground CLI-MFA dispatch failed',
        );
      }
    });
    return unsubscribe;
  }, []);

  // Workaround for Notifee 9.0.2 + RN 0.76: onForegroundEvent doesn't fire
  // reliably when the app is brought back from background by a notification
  // tap. We poll getInitialNotification() on AppState transitions to "active"
  // — Notifee returns the press data even on warm starts (it caches the most
  // recent unhandled press until consumed).
  useEffect(() => {
    const lastHandledRef = { current: null as string | null };

    const checkForPress = async () => {
      try {
        const initial = await notifee.getInitialNotification();
        // eslint-disable-next-line no-console -- TEMP debug
        console.log(
          '[Notifee:check-initial]',
          JSON.stringify({
            hasInitial: !!initial,
            pressActionId: initial?.pressAction?.id,
            notificationId: initial?.notification?.id,
            dataStr: initial?.notification?.data?.dataStr,
            // Hint when null on cold-start — usually means app was relaunched
            // via launcher icon / am start, NOT via notification tap.
            note: initial
              ? undefined
              : 'null = no notification press triggered this launch',
          }),
        );
        if (!initial) return;
        if (initial.pressAction?.id !== PressActionId.OPEN_CLI_MFA) return;

        const notifId = initial.notification?.id ?? '';
        if (notifId && notifId === lastHandledRef.current) return;
        lastHandledRef.current = notifId || null;

        const dataStr = initial.notification?.data?.dataStr;
        const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : null;
        if (data && typeof data.deeplink === 'string') {
          // CRITICAL: on cold-start, this fires within ~30ms of JS booting,
          // BEFORE Engine is initialized. Calling handleDeeplink here would
          // dispatch CHECK_FOR_DEEPLINK, wake handleDeeplinkSaga, which would
          // immediately try to read Engine.context.KeyringController, throw
          // "Engine does not exist", crash the root saga, and take down
          // startAppServices — leaving the app permanently stuck on splash.
          // So when Engine isn't ready yet, we only buffer the deeplink.
          // handleDeeplinkSaga's LOGIN listener will consume it post-unlock.
          const engineReady = Boolean(Engine.context?.KeyringController);
          if (!engineReady) {
            // eslint-disable-next-line no-console -- TEMP debug
            console.log(
              '[Notifee:check-initial] Engine not ready — buffering deeplink only via setCurrentDeeplink (saga will pick up on LOGIN)',
              data.deeplink,
            );
            AppStateEventProcessor.setCurrentDeeplink(
              data.deeplink,
              AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
            );
            // eslint-disable-next-line no-console -- TEMP debug
            console.log(
              '[Notifee:check-initial] post-buffer — pendingDeeplink=',
              AppStateEventProcessor.pendingDeeplink,
            );
          } else {
            // eslint-disable-next-line no-console -- TEMP debug
            console.log(
              '[Notifee:check-initial] dispatching deeplink',
              data.deeplink,
            );
            handleDeeplink({
              uri: data.deeplink,
              source: AppConstants.DEEPLINKS.ORIGIN_PUSH_NOTIFICATION,
            });
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console -- TEMP debug
        console.log('[Notifee:check-initial] threw', err);
      }
    };

    // Check on mount (cold-start case)
    checkForPress();

    // Check on every transition back to active (warm-start / from-background)
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkForPress();
    });

    return () => sub.remove();
  }, []);

  // Only wait for store in test mode, fonts are handled inside theme context
  if (isTest && isStoreLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <ErrorBoundary view="Root">
            {
              ///: BEGIN:ONLY_INCLUDE_IF(snaps)
              // NOTE: This must be mounted before Engine initialization since Engine interacts with SnapsExecutionWebView
              <SnapsExecutionWebView />
              ///: END:ONLY_INCLUDE_IF
            }
            <QueryClientProvider client={reactQueryService.queryClient}>
              <FeatureFlagOverrideProvider>
                <ThemeProvider>
                  <NavigationProvider>
                    <ControllersGate>
                      <ToastContextWrapper>
                        <HardwareWalletProvider>
                          <ReducedMotionConfig mode={ReduceMotion.Never} />
                          <App />
                        </HardwareWalletProvider>
                      </ToastContextWrapper>
                    </ControllersGate>
                  </NavigationProvider>
                </ThemeProvider>
              </FeatureFlagOverrideProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

export default Root;
