import React, { Component } from 'react';
import BackgroundBridge from '../../core/BackgroundBridge';
import CustomWebview from '../CustomWebview'; // eslint-disable-line import/no-unresolved
import Engine from '../../core/Engine';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import getNavbarOptions from '../Navbar';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { colors, baseStyles, fontStyles } from '../../styles/common';

const styles = StyleSheet.create({
	urlBar: {
		alignItems: 'stretch',
		backgroundColor: colors.concrete,
		flexDirection: 'row',
		paddingVertical: 8
	},
	icon: {
		color: colors.tar,
		flex: 0,
		height: 28,
		lineHeight: 28,
		paddingTop: 2,
		textAlign: 'center',
		width: 36
	},
	disabledIcon: {
		color: colors.ash
	},
	urlInput: {
		...fontStyles.normal,
		backgroundColor: colors.slate,
		borderRadius: 3,
		flex: 1,
		fontSize: 14,
		padding: 8
	}
});

/**
 * Complete Web browser component with URL entry and history management
 */
export default class Browser extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Browser', navigation);

	static defaultProps = {
		defaultProtocol: 'https://',
		defaultURL: 'https://eip1102.herokuapp.com'
	};

	static propTypes = {
		/**
		 * Protocol string to append to URLs that have none
		 */
		defaultProtocol: PropTypes.string,
		/**
		 * Initial URL to load in the WebView
		 */
		defaultURL: PropTypes.string.isRequired,
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object
	};

	state = {
		approvedOrigin: false,
		canGoBack: false,
		canGoForward: false,
		entryScriptWeb3: null,
		inputValue: this.props.defaultURL,
		url: this.props.defaultURL
	};

	webview = React.createRef();

	async componentDidMount() {
		this.backgroundBridge = new BackgroundBridge(Engine, this.webview);

		const entryScriptWeb3 =
			Platform.OS === 'ios'
				? await RNFS.readFile(`${RNFS.MainBundlePath}/InpageBridgeWeb3.js`, 'utf8')
				: await RNFS.readFileAssets(`InpageBridgeWeb3.js`);

		await this.setState({ entryScriptWeb3 });

		Engine.context.TransactionController.hub.on('unapprovedTransaction', transactionMeta => {
			this.props.navigation.push('Approval', { transactionMeta });
		});
	}

	go = () => {
		const url = this.state.inputValue;
		const hasProtocol = url.match(/^[a-z]*:\/\//);
		const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
		this.setState({ url: sanitizedURL });
	};

	goBack = () => {
		const { current } = this.webview;
		current && current.goBack();
	};

	goForward = () => {
		const { current } = this.webview;
		current && current.goForward();
	};

	reload = () => {
		const { current } = this.webview;
		current && current.reload();
	};

	onMessage = ({ nativeEvent: { data } }) => {
		data = typeof data === 'string' ? JSON.parse(data) : data;

		if (!data || !data.type) {
			return;
		}
		switch (data.type) {
			case 'INPAGE_REQUEST':
				this.backgroundBridge.onMessage(data);
				break;
		}
	};

	onPageChange = ({ canGoBack, canGoForward, url }) => {
		this.setState({ canGoBack, canGoForward, inputValue: url });
	};

	onURLChange = inputValue => {
		this.setState({ inputValue });
	};

	sendStateUpdate = () => {
		this.backgroundBridge.sendStateUpdate();
	};

	render() {
		const { canGoBack, canGoForward, entryScriptWeb3, inputValue, url } = this.state;
		return (
			<View style={baseStyles.flexGrow}>
				<View style={styles.urlBar}>
					<Icon
						disabled={!canGoBack}
						name="angle-left"
						onPress={this.goBack}
						size={30}
						style={{ ...styles.icon, ...(!canGoBack ? styles.disabledIcon : {}) }}
					/>
					<Icon
						disabled={!canGoForward}
						name="angle-right"
						onPress={this.goForward}
						size={30}
						style={{ ...styles.icon, ...(!canGoForward ? styles.disabledIcon : {}) }}
					/>
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						keyboardType="url"
						onChangeText={this.onURLChange}
						onSubmitEditing={this.go}
						placeholder="Enter website address"
						placeholderTextColor={colors.asphalt}
						returnKeyType="go"
						style={styles.urlInput}
						value={inputValue}
					/>
					<Icon disabled={!canGoForward} name="refresh" onPress={this.reload} size={20} style={styles.icon} />
				</View>
				<CustomWebview
					injectJavaScript={entryScriptWeb3}
					injectedJavaScriptForMainFrameOnly
					javaScriptEnabled
					messagingEnabled
					onLoadEnd={this.sendStateUpdate}
					onMessage={this.onMessage}
					onNavigationStateChange={this.onPageChange}
					openNewWindowInWebView
					ref={this.webview}
					source={{ uri: url }}
					style={baseStyles.flexGrow}
				/>
			</View>
		);
	}
}
