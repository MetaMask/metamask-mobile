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
import FontLoadingGate from './FontLoadingGate';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { SnapsExecutionWebView } from '../../../lib/snaps';
///: END:ONLY_INCLUDE_IF
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
// import { InteractionManager } from 'react-native';
// import {
//   checkForUpdateAsync,
//   fetchUpdateAsync,
//   reloadAsync,
// } from 'expo-updates';

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
    // Wait for store to be initialized in Detox tests
    if (isTest) {
      waitForStore();
    } else {
      setIsStoreLoading(false);
    }
  }, [foxCode]);

  // Non-blocking background update check after first interactions
  // useEffect(() => {
  //   let cancelled = false;
  //   const run = async () => {
  //     try {
  //       await new Promise<void>((resolve) =>
  //         InteractionManager.runAfterInteractions(() => resolve()),
  //       );
  //       if (cancelled) return;
  //       const update = await checkForUpdateAsync();
  //       if (update.isAvailable) {
  //         await fetchUpdateAsync();
  //         await reloadAsync();
  //       }
  //     } catch (e) {
  //       // Silently ignore update failures; do not impact UX
  //     }
  //   };
  //   run();
  //   return () => {
  //     cancelled = true;
  //   };
  // }, []);

  // Only wait for store in test mode, fonts are handled inside theme context
  if (isTest && isStoreLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          {
            ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
            // NOTE: This must be mounted before Engine initialization since Engine interacts with SnapsExecutionWebView
            <SnapsExecutionWebView />
            ///: END:ONLY_INCLUDE_IF
          }
          <ThemeProvider>
            <NavigationProvider>
              <ControllersGate>
                <ToastContextWrapper>
                  <ErrorBoundary view="Root">
                    <FontLoadingGate>
                      <ReducedMotionConfig mode={ReduceMotion.Never} />
                      <App />
                    </FontLoadingGate>
                  </ErrorBoundary>
                </ToastContextWrapper>
              </ControllersGate>
            </NavigationProvider>
          </ThemeProvider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

export default Root;
