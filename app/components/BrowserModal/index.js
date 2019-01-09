import React, { Component } from 'react';
import SafeAreaView from 'react-native';
// eslint-disable-next-line import/no-unresolved
import { withNavigation } from 'react-navigation';
import Browser from '../Browser';
import { getBrowserViewNavbarOptions } from '../Navbar';

class BrowserModal extends Component {
	static navigationOptions = ({ navigation }) => getBrowserViewNavbarOptions(navigation);

	render() {
		return (
			<SafeAreaView>
				<Browser {...this.props} />
			</SafeAreaView>
		);
	}
}

export default withNavigation(BrowserModal);
