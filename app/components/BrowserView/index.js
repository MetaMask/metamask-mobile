import React, { Component } from 'react';
import Browser from '../Browser';
import Screen from '../Screen';

export default class BrowserView extends Component {
	render() {
		return (
			<Screen>
				<Browser defaultUrl="http://metamask.io" />
			</Screen>
		);
	}
}
