import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';

import { store, persistor } from '../../store/';

import App from '../App';
import FoxScreen from '../FoxScreen';
import SecureKeychain from '../../core/SecureKeychain';

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
export default class Root extends Component {
	constructor(props) {
		super(props);

		// TO-DO: Salt needs to come from props
		SecureKeychain.init('SALTY AF');
	}
	render = () => (
		<Provider store={store}>
			<PersistGate loading={<FoxScreen />} persistor={persistor}>
				<App />
			</PersistGate>
		</Provider>
	);
}
