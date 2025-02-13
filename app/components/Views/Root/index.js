import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';
import { store, persistor } from '../../../store/';
import App from '../../Nav/App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import Logger from '../../../util/Logger';
import ErrorBoundary from '../ErrorBoundary';
import { useAppTheme, ThemeContext } from '../../../util/theme';
import { ToastContextWrapper } from '../../../component-library/components/Toast';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isE2E } from '../../../util/test/utils';

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

  async waitForStore() {
    // Wait until store is initialized
    await new Promise((resolve) => {
      const intervalId = setInterval(() => {
        if (store && persistor) {
          clearInterval(intervalId);
          resolve();
        }
      }, 100);
    });
  }

  constructor(props) {
    super(props);
    if (props.foxCode === '') {
      const foxCodeError = new Error('WARN - foxCode is an empty string');
      Logger.error(foxCodeError);
    }
    SecureKeychain.init(props.foxCode);
    // Init EntryScriptWeb3 asynchronously on the background
    EntryScriptWeb3.init();

    this.state = {
      isLoading: true, // Track loading state
      isE2E,
    };
  }

  async componentDidMount() {
    const { isE2E } = this.state;
    if (isE2E) {
      await this.waitForStore();
      this.setState({ isLoading: false });
    }
  }

  render() {
    const { isE2E, isLoading } = this.state;
    if (isE2E && isLoading) {
      return null;
    }

    return (
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <ConnectedRoot />
        </PersistGate>
      </Provider>
    );
  }
}

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
