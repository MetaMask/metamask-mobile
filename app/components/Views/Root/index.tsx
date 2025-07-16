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
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { SnapsExecutionWebView } from '../../../lib/snaps';
///: END:ONLY_INCLUDE_IF
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import {
  AppState,
  AppStateStatus,
  StyleSheet,
  View,
  Platform,
  NativeEventEmitter,
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { DeviceEventManagerModule } = NativeModules;
const nativeEmitter = new NativeEventEmitter(DeviceEventManagerModule);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 1000,
  },
});

export function BackgroundSecurityOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // iOS / general background
    const subAppState = AppState.addEventListener('change', (state) => {
      if (Platform.OS === 'ios') {
        setVisible(state !== 'active');
      }
    });

    // Android: window focus lost / regained
    // const subNative = nativeEmitter.addListener(
    //   'windowFocusChanged',
    //   (hasFocus: boolean) => {
    //     console.log('XXXXXX - windowFocusChanged', hasFocus);
    //     // blur when focus lost (Recent‑Apps, lock screen, etc.)
    //     setVisible(!hasFocus);
    //   },
    // );

    const subNative = DeviceEventEmitter.addListener(
      'windowFocusChanged',
      (hasFocus) => {
        console.log('XXXXXX - windowFocusChanged', hasFocus);
        setVisible(!hasFocus);
      },
    );

    // initialize on mount
    if (Platform.OS === 'ios') {
      setVisible(AppState.currentState !== 'active');
    } else {
      // assume we start focused
      setVisible(false);
    }

    return () => {
      subAppState.remove();
      subNative.remove();
    };
  }, []);

  if (!visible) return null;

  return Platform.OS === 'ios' ? (
    <BlurView intensity={50} style={styles.container} />
  ) : (
    <View style={styles.androidOverlay} />
  );
}

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
const Root = ({ foxCode }: RootProps) => {
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Wait for store to be initialized in Detox tests
   * Note: This is a workaround for an issue with Detox where the store is not initialized
   */
  const waitForStore = () =>
    new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (store && persistor) {
          clearInterval(intervalId);
          setIsLoading(false);
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
    }
  }, [foxCode]);

  if (isTest && isLoading) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <BackgroundSecurityOverlay />
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
                    <ReducedMotionConfig mode={ReduceMotion.Never} />
                    <App />
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
