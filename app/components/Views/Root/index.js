import React, { PureComponent } from 'react';
import propTypes from 'prop-types';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';

import { store, persistor } from '../../../store/';
import SplashScreen from 'react-native-splash-screen';

import App from '../../Nav/App';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
export default class Root extends PureComponent {
	static propTypes = {
		foxCode: propTypes.string
	};

	static defaultProps = {
		foxCode: 'null'
	};

	constructor(props) {
		super(props);
		SecureKeychain.init(props.foxCode);
		// Init EntryScriptWeb3 asynchronously on the background
		EntryScriptWeb3.init();
		SplashScreen.hide();
	}

	render = () => (
		<Provider store={store}>
			<PersistGate persistor={persistor}>
				<App />
			</PersistGate>
		</Provider>
	);
}
