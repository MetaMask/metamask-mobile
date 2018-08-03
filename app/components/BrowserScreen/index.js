import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Browser from '../Browser';
import Screen from '../Screen';

/**
 * Main view component for the browser screen
 */
export default class BrowserScreen extends Component {
	static propTypes = {
		/**
		 * Instance of a core engine object
		 */
		engine: PropTypes.object.isRequired
	};

	render() {
		return (
			<Screen>
				<Browser defaultURL="https://eip1102.herokuapp.com" engine={this.props.engine} />
			</Screen>
		);
	}
}
