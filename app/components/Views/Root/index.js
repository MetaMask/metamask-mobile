import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { store, persistor, createStoreAndPersistor } from '../../../store/';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';
import Logger from '../../../util/Logger';
import { isTest } from '../../../util/test/utils';
import { ConnectedRoot } from './ConnectedRoot';

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

  initStorePromise = null;

  constructor(props) {
    super(props);
    if (props.foxCode === '') {
      const foxCodeError = new Error('WARN - foxCode is an empty string');
      Logger.error(foxCodeError);
    }
    SecureKeychain.init(props.foxCode);
    // Init EntryScriptWeb3 asynchronously on the background
    EntryScriptWeb3.init();

    this.initStorePromise = createStoreAndPersistor().catch(console.error);

    this.state = {
      isLoading: true, // Track loading state
      isTest,
    };
  }

  async componentDidMount() {
    const { isTest } = this.state;
    if (isTest && this.initStorePromise) {
      await this.initStorePromise();
      this.setState({ isLoading: false });
    }
  }

  render() {
    const { isTest, isLoading } = this.state;
    if (isTest && isLoading) {
      return null;
    }

    return <ConnectedRoot store={store} persistor={persistor} />;
  }
}
