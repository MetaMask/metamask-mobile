import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Wallet from '../Wallet';
import Screen from '../Screen';

/**
 * Main view component for the wallet screen
 */
export default class WalletScreen extends Component {
	static propTypes = {
		/**
		 * Instance of a core engine object
		 */
		engine: PropTypes.object.isRequired
	};

	render() {
		return (
			<Screen>
				<Wallet engine={this.props.engine} />
			</Screen>
		);
	}
}
