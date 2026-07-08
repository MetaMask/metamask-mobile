import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Provider as ReduxProvider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { store, persistor } from '../../../store';
import App from '../../Nav/App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import Logger from '../../../util/Logger';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import ErrorBoundary from '../ErrorBoundary';
import ThemeProvider from '../../../component-library/providers/ThemeProvider/ThemeProvider';
import { ToastContextWrapper } from '../../../component-library/components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { RootProps } from './types';
import NavigationProvider from '../../Nav/NavigationProvider';
import ControllersGate from '../../Nav/ControllersGate';
import { isTestEnvironment } from '../../../util/test/utils';
import { FeatureFlagOverrideProvider } from '../../../contexts/FeatureFlagOverrideContext';
import { ScreenOrientationService } from '../../../core/ScreenOrientation';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { SnapsExecutionWebView } from '../../../lib/snaps';
///: END:ONLY_INCLUDE_IF
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import reactQueryService from '../../../core/ReactQueryService';
import { HardwareWalletProvider } from '../../../core/HardwareWallet';
import { UIMessengerProvider } from '../../../contexts/ui-messenger';
import { Toaster } from '@metamask/design-system-react-native';
import {
  createUIMessenger,
  UIMessenger,
} from '../../../messengers/ui-messenger';

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  appRoot: {
    flex: 1,
  },
  toasterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
const Root = ({ foxCode }: RootProps) => {
  const [isStoreLoading, setIsStoreLoading] = useState(true);

  // We use a ref to make sure the UI messenger is only created once.
  const uiMessengerRef = useRef<UIMessenger | null>(null);
  if (!uiMessengerRef.current) {
    uiMessengerRef.current = createUIMessenger();
  }

  const uiMessenger = uiMessengerRef.current;

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
    if (isTestEnvironment) {
      waitForStore();
    } else {
      setIsStoreLoading(false);
    }
  }, [foxCode]);

  // Only wait for store in test mode, fonts are handled inside theme context
  if (isTestEnvironment && isStoreLoading) {
    return null;
  }

  return (
    // GestureHandlerRootView must sit above the navigation tree so every screen
    // (including native-stack modals) has a gesture root. React Navigation v6
    // native-stack does not add this automatically.
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ReduxProvider store={store}>
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
                      <View style={styles.appRoot}>
                        <NavigationProvider>
                          <ControllersGate>
                            <UIMessengerProvider value={uiMessenger}>
                              <ToastContextWrapper>
                                <HardwareWalletProvider>
                                  <ReducedMotionConfig
                                    mode={ReduceMotion.Never}
                                  />
                                  <App />
                                </HardwareWalletProvider>
                              </ToastContextWrapper>
                            </UIMessengerProvider>
                          </ControllersGate>
                        </NavigationProvider>
                        <View
                          style={styles.toasterOverlay}
                          pointerEvents="box-none"
                        >
                          <Toaster />
                        </View>
                      </View>
                    </ThemeProvider>
                  </FeatureFlagOverrideProvider>
                </QueryClientProvider>
              </ErrorBoundary>
            </PersistGate>
          </ReduxProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default Root;
