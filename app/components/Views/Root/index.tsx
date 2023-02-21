import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { store, persistor } from '../../../store/';
import SplashScreen from 'react-native-splash-screen';
import App from '../../Nav/App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import Logger from '../../../util/Logger';
import ErrorBoundary from '../ErrorBoundary';
import { useAppTheme, ThemeContext } from '../../../util/theme';
import { ToastContextWrapper } from '../../../component-library/components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const ConnectedRoot = () => {
  const theme = useAppTheme();

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <ToastContextWrapper>
          <ErrorBoundary view="Root">
            <App />
          </ErrorBoundary>
        </ToastContextWrapper>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
};

interface Props {
  foxCode: string;
}

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
const Root = ({ foxCode = 'null' }: Props) => {
  useEffect(() => {
    if (foxCode === '') {
      Logger.error('WARN - foxCode is an empty string');
    }

    SecureKeychain.init(foxCode);
    // Init EntryScriptWeb3 asynchronously on the background
    EntryScriptWeb3.init();
    SplashScreen.hide();
  }, [foxCode]);

  return (
    <Provider store={store}>
      <PersistGate persistor={persistor}>
        <ConnectedRoot />
      </PersistGate>
    </Provider>
  );
};

export default Root;
