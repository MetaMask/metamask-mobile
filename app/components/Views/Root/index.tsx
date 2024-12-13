import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { store, persistor } from '../../../store';
import App from '../../Nav/App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import Logger from '../../../util/Logger';
import ErrorBoundary from '../ErrorBoundary';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { ToastContextWrapper } from '../../../component-library/components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootProps } from './types';
import NavigationGate from '../../Nav/NavigationGate';
import { isTest } from '../../../util/test/utils';

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
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <ThemeContext.Provider value={mockTheme}>
            <ToastContextWrapper>
              <ErrorBoundary view="Root">
                <NavigationGate>
                  <App />
                </NavigationGate>
              </ErrorBoundary>
            </ToastContextWrapper>
          </ThemeContext.Provider>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
};

export default Root;
