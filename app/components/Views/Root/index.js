import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
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

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
export default class Root extends PureComponent {
  static propTypes = {
    foxCode: PropTypes.string,
  };

  static defaultProps = {
    foxCode: 'null',
  };

  constructor(props) {
    super(props);
    console.log(`Root constructor at ${new Date().toISOString()}`);
    if (props.foxCode === '') {
      Logger.error('WARN - foxCode is an empty string');
    }
    SecureKeychain.init(props.foxCode);
    // Init EntryScriptWeb3 asynchronously on the background
    EntryScriptWeb3.init();
    SplashScreen.hide();
  }

  render = () => (
    <Provider store={store}>
      <ConnectedRoot />
    </Provider>
  );
}

const ConnectedRoot = () => {
  console.log('ConnectedRoot');
  const theme = useAppTheme();

  function errorHandler(error, stackTrace) {
    Logger.error(error, stackTrace);
  };

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <ToastContextWrapper>
          <ErrorBoundary onError={errorHandler} view="Root">
            <App />
          </ErrorBoundary>
        </ToastContextWrapper>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
};
