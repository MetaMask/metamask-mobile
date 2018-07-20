import React, { Component } from 'react';
import Icon from 'react-native-vector-icons/FontAwesome';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import WKWebView from 'react-native-wkwebview-reborn';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { colors, baseStyles } from '../../styles/common';

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
	static defaultProps = {
		defaultProtocol: 'https://'
	};

	static propTypes = {
		/**
		 * Protocol string to append to URLs that have none
		 */
		defaultProtocol: PropTypes.string,
		/**
		 * Initial URL to load in the WebView
		 */
		defaultURL: PropTypes.string.isRequired
	};

	state = {
		approvedOrigin: false,
		canGoBack: false,
		canGoForward: false,
		entryScript: null,
		inputValue: this.props.defaultURL,
		url: this.props.defaultURL
	};

	webview = React.createRef();

	async componentDidMount() {
		const entryScript = await RNFS.readFile(`${RNFS.MainBundlePath}/entry.js`, 'utf8');
		this.setState({ entryScript });
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

	injectEntryScript = () => {
		const { current } = this.webview;
		const { entryScript } = this.state;
		entryScript && current && current.evaluateJavaScript(entryScript);
	};

	onMessage = ({ nativeEvent: { data } }) => {
		if (!data || !data.type) {
			return;
		}
		switch (data.type) {
			case 'ETHEREUM_PROVIDER_REQUEST':
				this.handleProviderRequest();
				break;
		}
	};

	handleProviderRequest() {
		Alert.alert(
			'Ethereum access',
			`The domain "${
				this.state.url
			}" is requesting access to the Ethereum blockchain and to view your current account. Always double check that you're on the correct site before approving access.`,
			[{ text: 'Reject', style: 'cancel' }, { text: 'Approve', onPress: this.injectEntryScript }],
			{ cancelable: false }
		);
	}

	onPageChange = ({ canGoBack, canGoForward, url }) => {
		this.setState({ canGoBack, canGoForward, inputValue: url });
	};

	onURLChange = inputValue => {
		this.setState({ inputValue });
	};

	render() {
		const { canGoBack, canGoForward, inputValue, url } = this.state;
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
				<WKWebView
					injectJavaScript={
						'window.originalPostMessage = window.postMessage; window.postMessage = function (data) { window.webkit.messageHandlers.reactNative.postMessage(data); }'
					}
					injectedJavaScriptForMainFrameOnly
					javaScriptEnabled
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
