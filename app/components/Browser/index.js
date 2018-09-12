import React, { Component } from 'react';
import BackgroundBridge from '../../core/BackgroundBridge';
import Web3Webview from 'react-native-web3-webview';
import Engine from '../../core/Engine';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import getNavbarOptions from '../Navbar';
import WebviewProgressBar from '../WebviewProgressBar';
import { Text, ActivityIndicator, Platform, StyleSheet, TextInput, View, TouchableWithoutFeedback } from 'react-native';
import { colors, baseStyles, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import Networks from '../../util/networks';
import Logger from '../../util/Logger';
import Button from '../Button';
import Share from 'react-native-share'; // eslint-disable-line  import/default

const styles = StyleSheet.create({
	wrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.concrete
	},
	urlBar: {
		alignItems: 'stretch',
		backgroundColor: colors.concrete,
		flexDirection: 'row',
		paddingVertical: 11
	},
	icon: {
		color: colors.tar,
		flex: 0,
		height: 28,
		lineHeight: 28,
		textAlign: 'center',
		width: 36,
		alignSelf: 'center'
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
	},
	progressBarWrapper: {
		height: 3,
		marginTop: -5
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	optionsOverlay: {
		position: 'absolute',
		zIndex: 99999998,
		top: 0,
		bottom: 0,
		left: 0,
		right: 0
	},
	optionsWrapper: {
		position: 'absolute',
		zIndex: 99999999,
		marginTop: 50,
		right: 3,
		width: 180,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		backgroundColor: colors.concrete
	},
	option: {
		backgroundColor: colors.concrete,
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'flex-start'
	},
	optionText: {
		fontSize: 14
	},
	optionIcon: {}
});

/**
 * Complete Web browser component with URL entry and history management
 */
export class Browser extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Browser', navigation);

	static defaultProps = {
		defaultProtocol: 'https://',
		defaultURL: 'https://faucet.metamask.io'
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
		url: this.props.defaultURL,
		showOptions: false
	};

	webview = React.createRef();

	async componentDidMount() {
		this.backgroundBridge = new BackgroundBridge(Engine, this.webview);

		const entryScriptWeb3 =
			Platform.OS === 'ios'
				? await RNFS.readFile(`${RNFS.MainBundlePath}/InpageBridgeWeb3.js`, 'utf8')
				: await RNFS.readFileAssets(`InpageBridgeWeb3.js`);

		const { networkType, selectedAddress } = this.props;

		const updatedentryScriptWeb3 = entryScriptWeb3
			.replace('INITIAL_NETWORK', Networks[networkType].networkId.toString())
			.replace('INITIAL_SELECTED_ADDRESS', selectedAddress);

		await this.setState({ entryScriptWeb3: updatedentryScriptWeb3 });

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

	share = () => {
		Share.open({
			url: this.state.url
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	toggleOptions = () => {
		this.setState({ showOptions: !this.state.showOptions });
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

	onLoadProgress = progress => {
		this.setState({ progress });
	};

	renderLoader() {
		return (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	renderOptions() {
		if (this.state.showOptions) {
			return (
				<TouchableWithoutFeedback onPress={this.toggleOptions}>
					<View style={styles.optionsOverlay}>
						<View style={styles.optionsWrapper}>
							<Button onPress={this.reload} style={styles.option}>
								<Icon name="refresh" size={18} style={[styles.icon, styles.optionIcon]} />
								<Text style={styles.optionText}>Reload</Text>
							</Button>
							<Button onPress={this.bookmark} style={styles.option}>
								<Icon name="star" size={18} style={[styles.icon, styles.optionIcon]} />
								<Text style={styles.optionText}>Bookmark</Text>
							</Button>
							<Button onPress={this.share} style={styles.option}>
								<Icon name="share" size={18} style={[styles.icon, styles.optionIcon]} />
								<Text style={styles.optionText}>Share</Text>
							</Button>
						</View>
					</View>
				</TouchableWithoutFeedback>
			);
		}
	}

	render() {
		const { canGoBack, canGoForward, entryScriptWeb3, inputValue, url } = this.state;

		return (
			<View style={styles.wrapper}>
				<View style={styles.urlBar}>
					<Icon
						disabled={!canGoBack}
						name="angle-left"
						onPress={this.goBack}
						size={30}
						style={{ ...styles.icon, ...(!canGoBack ? styles.disabledIcon : {}) }}
					/>
					{canGoForward ? (
						<Icon
							disabled={!canGoForward}
							name="angle-right"
							onPress={this.goForward}
							size={30}
							style={{ ...styles.icon, ...(!canGoForward ? styles.disabledIcon : {}) }}
						/>
					) : null}
					<TextInput
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						keyboardType="url"
						textContentType={'URL'}
						onChangeText={this.onURLChange}
						onSubmitEditing={this.go}
						placeholder="Enter website address"
						placeholderTextColor={colors.asphalt}
						returnKeyType="go"
						style={styles.urlInput}
						value={inputValue}
					/>
					<MaterialIcon name="more-vert" onPress={this.toggleOptions} size={20} style={styles.icon} />
				</View>
				<View style={styles.progressBarWrapper}>
					<WebviewProgressBar progress={this.state.progress} />
				</View>
				{this.renderOptions()}
				{entryScriptWeb3 ? (
					<Web3Webview
						injectedOnStartLoadingJavaScript={entryScriptWeb3}
						injectedJavaScriptForMainFrameOnly
						onProgress={this.onLoadProgress}
						onMessage={this.onMessage}
						onNavigationStateChange={this.onPageChange}
						ref={this.webview}
						source={{ uri: url }}
						style={baseStyles.flexGrow}
					/>
				) : (
					this.renderLoader()
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	networkType: state.backgroundState.NetworkController.provider.type,
	selectedAddress: state.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(Browser);
