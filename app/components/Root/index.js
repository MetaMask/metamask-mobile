import React, { Component } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/lib/integration/react';

import { store, persistor } from '../../store/';

import App from '../App';
import LockScreen from '../LockScreen';

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */
export default class Root extends Component {
	render() {
		return (
			<Provider store={store}>
				<PersistGate loading={<LockScreen />} persistor={persistor}>
					<App />
				</PersistGate>
			</Provider>
		);
	}
}
