import React, { Component } from 'react';
import Wallet from '../Wallet';
import Screen from '../Screen';

/**
 * Main view component for the wallet screen
 */
export default class WalletScreen extends Component {
	render() {
		return (
			<Screen>
				<Wallet />
			</Screen>
		);
	}
}
