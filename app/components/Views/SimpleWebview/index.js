import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { getWebviewNavbar } from '../../UI/Navbar';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import Logger from '../../../util/Logger';
import { baseStyles } from '../../../styles/common';

export default class SimpleWebview extends PureComponent {
	static navigationOptions = ({ navigation, route }) => getWebviewNavbar(navigation, route);

	static propTypes = {
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Object that represents the current route info like params passed to it
		 */
		route: PropTypes.object,
	};

	componentDidMount = () => {
		const { navigation } = this.props;
		navigation && navigation.setParams({ dispatch: this.share });
	};

	share = () => {
		const { route } = this.props;
		const url = route.params?.url;
		if (url) {
			Share.open({
				url,
			}).catch((err) => {
				Logger.log('Error while trying to share simple web view', err);
			});
		}
	};

	render() {
		const uri = this.props.route.params?.url;
		if (uri) {
			return (
				<View style={baseStyles.flexGrow}>
					<WebView source={{ uri }} />
				</View>
			);
		}
	}
}
