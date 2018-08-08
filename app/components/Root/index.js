import React, { Component } from 'react';
import App from '../App';
import { Provider } from 'react-redux';
import store from '../../store/';

/**
 * Top level of the component hierarchy
 * App component is wrapped by the provider from react-redux
 */

export default class Root extends Component {
	render() {
		return (
			<Provider store={store}>
				<App />
			</Provider>
		);
	}
}
