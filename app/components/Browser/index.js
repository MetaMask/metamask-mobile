import React, { Component } from 'react';
import {
	Text,
	ActivityIndicator,
	Platform,
	StyleSheet,
	TextInput,
	View,
	TouchableWithoutFeedback,
	AsyncStorage,
	Alert
} from 'react-native';
import Web3Webview from 'react-native-web3-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { connect } from 'react-redux';
import BackgroundBridge from '../../core/BackgroundBridge';
import Engine from '../../core/Engine';
import getNavbarOptions from '../Navbar';
import WebviewProgressBar from '../WebviewProgressBar';
import { colors, baseStyles, fontStyles } from '../../styles/common';
import Networks from '../../util/networks';
import Logger from '../../util/Logger';
import resolveEnsToIpfsContentId from '../../lib/ens-ipfs/resolver';
import Button from '../Button';
import { strings } from '../../../locales/i18n';
import HomePage from '../HomePage';
import URL from 'url-parse';

const SUPPORTED_TOP_LEVEL_DOMAINS = ['eth'];

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
		shadowColor: colors.gray,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		position: 'absolute',
		zIndex: 99999999,
		marginTop: 50,
		right: 3,
		width: 140,
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
		fontSize: 14,
		color: colors.fontPrimary,
		...fontStyles.normal
	},
	optionIcon: {
		width: 18,
		color: colors.tar,
		flex: 0,
		height: 15,
		lineHeight: 15,
		marginRight: 10,
		textAlign: 'center',
		alignSelf: 'center'
	}
});

/**
 * Complete Web browser component with URL entry and history management
 */
export class Browser extends Component {
	static navigationOptions = ({ navigation }) => getNavbarOptions('Browser', navigation);

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
		defaultURL: PropTypes.string,
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * Url coming from an external source
		 * For ex. deeplinks
		 */
		url: PropTypes.string
	};

	state = {
		approvedOrigin: false,
		canGoBack: false,
		canGoForward: false,
		entryScriptWeb3: null,
		inputValue: '',
		url: this.props.defaultURL || '',
		showOptions: false,
		currentPageTitle: '',
		bookmarks: [],
		timeout: false,
		ipfsWebsite: false,
		ipfsGateway: 'https://ipfs.io/ipfs/',
		ipfsHash: null,
		currentEnsName: null
	};

	webview = React.createRef();

	timeoutHandler = null;

	loadBookmarks = async () => {
		const bookmarksStr = await AsyncStorage.getItem('@MetaMask:bookmarks');
		if (bookmarksStr) {
			this.setState({ bookmarks: JSON.parse(bookmarksStr).reverse() });
		}
	};

	async componentDidMount() {
		await this.loadBookmarks();
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

		this.checkForDeeplinks();
	}

	checkForDeeplinks() {
		const { navigation } = this.props;
		if (navigation) {
			const url = navigation.getParam('url', null);
			if (url) {
				this.setState({ url });
			}
		}
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;

		if (prevNavigation && navigation) {
			const prevUrl = prevNavigation.getParam('url', null);
			const currentUrl = navigation.getParam('url', null);

			if (currentUrl && prevUrl !== currentUrl && currentUrl !== this.state.url) {
				this.checkForDeeplinks();
			}
		}
	}

	go = async url => {
		const hasProtocol = url.match(/^[a-z]*:\/\//);
		const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
		const urlObj = new URL(sanitizedURL);
		const { hostname, query, pathname } = urlObj;
		const tld = hostname.split('.').pop();
		let ipfsContent = null;
		let currentEnsName = null;
		let ipfsHash = null;

		if (SUPPORTED_TOP_LEVEL_DOMAINS.indexOf(tld.toLowerCase()) !== -1) {
			ipfsContent = await this.handleIpfsContent(sanitizedURL, { hostname, query, pathname });

			if (ipfsContent) {
				const urlObj = new URL(sanitizedURL);
				currentEnsName = urlObj.hostname;
				ipfsHash = ipfsContent
					.replace(this.state.ipfsGateway, '')
					.split('/')
					.shift();
			}
		}

		const urlToGo = ipfsContent || sanitizedURL;
		this.setState({
			url: urlToGo,
			progress: 0,
			ipfsWebsite: true,
			inputValue: sanitizedURL,
			currentEnsName,
			ipfsHash
		});

		this.timeoutHandler && clearTimeout(this.timeoutHandler);
		this.timeoutHandler = setTimeout(() => {
			this.urlTimedOut(urlToGo);
		}, 60000);
	};

	urlTimedOut(url) {
		Logger.log('Browser::url::Timeout!', url);
	}

	urlNotFound(url) {
		Logger.log('Browser::url::Not found!', url);
	}

	urlNotSupported(url) {
		Logger.log('Browser::url::Not supported!', url);
	}

	urlErrored(url) {
		Logger.log('Browser::url::Unknown error!', url);
	}

	async handleIpfsContent(fullUrl, { hostname, pathname, query }) {
		const { provider } = Engine.context.NetworkController;
		let ipfsHash;
		try {
			ipfsHash = await resolveEnsToIpfsContentId({ provider, name: hostname });
		} catch (err) {
			this.timeoutHandler && clearTimeout(this.timeoutHandler);
			Logger.error('Failed to resolve ENS name', err);
			err === 'unsupport' ? this.urlNotSupported(fullUrl) : this.urlErrored(fullUrl);
			return null;
		}

		const gatewayUrl = this.state.ipfsGateway + ipfsHash + (pathname || '') + (query || '');

		try {
			const response = await fetch(gatewayUrl, { method: 'HEAD' });
			const statusCode = response.status;
			if (statusCode !== 200) {
				this.urlNotFound(gatewayUrl);
				return null;
			}
			return gatewayUrl;
		} catch (err) {
			// If there's an error our fallback mechanism is
			// to point straight to the ipfs gateway
			Logger.error('Failed to fetch ipfs website via ens', err);
			return 'https://ipfs.io/ipfs/' + ipfsHash;
		}
	}

	onUrlInputSubmit = async () => {
		await this.go(this.state.inputValue);
	};

	goBack = () => {
		if (this.state.canGoBack) {
			const { current } = this.webview;
			current && current.goBack();
		} else {
			this.setState({
				inputValue: '',
				url: '',
				ipfsContent: null,
				ipfsHash: null,
				ipfsWebsite: null,
				currentEnsName: null
			});
		}
	};

	goForward = () => {
		const { current } = this.webview;
		current && current.goForward();
	};

	reload = () => {
		const { current } = this.webview;
		current && current.reload();
	};

	bookmark = () => {
		this.toggleOptions();
		// Check it doesn't exist already
		if (this.state.bookmarks.filter(i => i.url === this.state.inputValue).length) {
			Alert.alert(strings('browser.error'), strings('browser.bookmarkAlreadyExists'));
			return false;
		}

		this.props.navigation.push('AddBookmark', {
			title: this.state.currentPageTitle || '',
			url: this.state.inputValue,
			onAddBookmark: async ({ name, url }) => {
				const newBookmarks = this.state.bookmarks;
				newBookmarks.push({ name, url });
				this.setState({ bookmarks: newBookmarks });
				await AsyncStorage.setItem('@MetaMask:bookmarks', JSON.stringify(newBookmarks));
			}
		});
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
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;

			if (!data || !data.type) {
				return;
			}
			switch (data.type) {
				case 'INPAGE_REQUEST':
					this.backgroundBridge.onMessage(data);
					break;
				case 'GET_TITLE_FOR_BOOKMARK':
					if (data.title) {
						this.setState({ currentPageTitle: data.title });
					}
					break;
			}
		} catch (e) {
			Logger.error(`Browser::onMessage on ${this.state.inputValue}`, e.toString());
		}
	};

	onPageChange = ({ canGoBack, canGoForward, url }) => {
		const data = { canGoBack, canGoForward };
		if (!this.state.ipfsWebsite) {
			data.inputValue = url;
		} else {
			data.inputValue = url.replace(
				`${this.state.ipfsGateway}${this.state.ipfsHash}`,
				`https://${this.state.currentEnsName}`
			);
		}
		this.setState(data);
	};

	onInitialUrlSubmit = async url => {
		if (url === '') {
			return false;
		}

		//Check if it's a url or a keyword
		const res = url.match(
			/^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([-.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g
		);
		if (res === null) {
			// In case of keywords we default to google search
			await this.go('https://www.google.com/search?q=' + escape(url));
		} else {
			await this.go(url);
		}
	};

	updateBookmarks = async bookmarks => {
		this.setState({ bookmarks });
		await AsyncStorage.setItem('@MetaMask:bookmarks', JSON.stringify(bookmarks));
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

	onLoadEnd = () => {
		// We need to get the title of the page first
		const { current } = this.webview;
		const js = `
			(function () {
				window.postMessage(
					JSON.stringify({
						type: 'GET_TITLE_FOR_BOOKMARK',
						title: document.title
					})
				)
			})();
		`;
		Platform.OS === 'ios' ? current.evaluateJavaScript(js) : current.injectJavaScript(js);
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
								<Icon name="refresh" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>{strings('browser.reload')}</Text>
							</Button>
							<Button onPress={this.bookmark} style={styles.option}>
								<Icon name="star" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>{strings('browser.bookmark')}</Text>
							</Button>
							<Button onPress={this.share} style={styles.option}>
								<Icon name="share" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>{strings('browser.share')}</Text>
							</Button>
						</View>
					</View>
				</TouchableWithoutFeedback>
			);
		}
	}

	render() {
		const { canGoForward, entryScriptWeb3, inputValue, url } = this.state;

		if (this.state.url === '') {
			return (
				<HomePage
					bookmarks={this.state.bookmarks}
					onBookmarkTapped={this.go}
					onInitialUrlSubmit={this.onInitialUrlSubmit}
					updateBookmarks={this.updateBookmarks}
				/>
			);
		}

		return (
			<View style={styles.wrapper}>
				<View style={styles.urlBar}>
					<Icon name="angle-left" onPress={this.goBack} size={30} style={styles.icon} />
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
						onSubmitEditing={this.onUrlInputSubmit}
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
						onLoadEnd={this.onLoadEnd}
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
