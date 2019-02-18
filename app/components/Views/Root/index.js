import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';

import { store, persistor } from '../../../store/';

import App from '../../Nav/App';
import FoxScreen from '../../UI/FoxScreen';
import SecureKeychain from '../../../core/SecureKeychain';

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
export default class Root extends Component {
	constructor(props) {
		super(props);
		SecureKeychain.init(props.foxCode); // eslint-disable-line
	}

	render = () => (
		<Provider store={store}>
			<PersistGate loading={<FoxScreen />} persistor={persistor}>
				<App />
			</PersistGate>
		</Provider>
	);
}
