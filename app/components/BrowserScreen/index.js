import React, { Component } from 'react';
import Browser from '../Browser';
import Screen from '../Screen';

/**
 * Main view component for the browser screen
 */
export default class BrowserScreen extends Component {
	render() {
		return (
			<Screen>
				<Browser defaultURL="https://eip1102.herokuapp.com" />
			</Screen>
		);
	}
}
