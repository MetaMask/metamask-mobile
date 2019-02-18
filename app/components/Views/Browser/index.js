import React, { Component } from 'react';
import {
	Text,
	ActivityIndicator,
	Platform,
	StyleSheet,
	TextInput,
	View,
	TouchableWithoutFeedback,
	Alert,
	Animated,
	SafeAreaView,
	TouchableOpacity,
	Linking
} from 'react-native';
import Web3Webview from 'react-native-web3-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { connect } from 'react-redux';
import BackgroundBridge from '../../../core/BackgroundBridge';
import Engine from '../../../core/Engine';
import { getBrowserViewNavbarOptions } from '../../UI/Navbar';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import Networks from '../../../util/networks';
import Logger from '../../../util/Logger';
import onUrlSubmit from '../../../util/browser';
import resolveEnsToIpfsContentId from '../../../lib/ens-ipfs/resolver';
import Button from '../../UI/Button';
import { strings } from '../../../../locales/i18n';
import URL from 'url-parse';
import Modal from 'react-native-modal';
import PersonalSign from '../../UI/PersonalSign';
import TypedSign from '../../UI/TypedSign';
import UrlAutocomplete from '../../UI/UrlAutocomplete';
import AccountApproval from '../../UI/AccountApproval';
import { approveHost } from '../../../actions/privacy';
import { addBookmark } from '../../../actions/bookmarks';
import { addToHistory } from '../../../actions/browser';

const SUPPORTED_TOP_LEVEL_DOMAINS = ['eth'];
const SCROLL_THRESHOLD = 100;

const styles = StyleSheet.create({
	wrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.concrete
	},
	icon: {
		color: colors.tar,
		height: 28,
		lineHeight: 28,
		textAlign: 'center',
		width: 36,
		alignSelf: 'center'
	},
	disabledIcon: {
		color: colors.ash
	},
	progressBarWrapper: {
		height: 3,
		marginTop: 0
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
		width: 160,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: colors.borderColor,
		backgroundColor: colors.concrete
	},
	optionsWrapperAndroid: {
		top: 0,
		right: 0,
		elevation: 5
	},
	optionsWrapperIos: {
		shadowColor: colors.gray,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		bottom: 70,
		right: 3
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
	},
	webview: {
		...baseStyles.flexGrow
	},
	bottomBar: {
		height: 44,
		alignItems: 'center',
		flexDirection: 'row',
		paddingHorizontal: 10
	},
	iconMore: {
		alignSelf: 'flex-end',
		alignContent: 'flex-end'
	},
	iconsLeft: {
		flex: 1,
		alignContent: 'flex-start',
		flexDirection: 'row'
	},
	iconsRight: {
		flex: 1,
		alignContent: 'flex-end'
	},
	urlModalContent: {
		flexDirection: 'row',
		paddingTop: Platform.OS === 'android' ? 10 : 50,
		paddingHorizontal: 10,
		backgroundColor: colors.white,
		height: Platform.OS === 'android' ? 59 : 87
	},
	urlModal: {
		justifyContent: 'flex-start',
		margin: 0
	},
	urlInput: {
		...fontStyles.normal,
		backgroundColor: Platform.OS === 'android' ? colors.white : colors.slate,
		borderRadius: 30,
		fontSize: Platform.OS === 'android' ? 16 : 14,
		padding: 8,
		paddingLeft: 15,
		textAlign: 'left',
		flex: 1,
		height: Platform.OS === 'android' ? 40 : 30
	},
	cancelButton: {
		marginTop: 7,
		marginLeft: 10
	},
	cancelButtonText: {
		fontSize: 14,
		color: colors.primary,
		...fontStyles.normal
	},
	iconCloseButton: {
		borderRadius: 300,
		backgroundColor: colors.fontSecondary,
		color: colors.white,
		fontSize: 18,
		padding: 0,
		height: 20,
		width: 20,
		paddingBottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 10,
		marginRight: 5
	},
	iconClose: {
		color: colors.white,
		fontSize: 18
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

/**
 * Complete Web browser component with URL entry and history management
 */
export class Browser extends Component {
	static navigationOptions = ({ navigation }) => getBrowserViewNavbarOptions(navigation);

	static defaultProps = {
		defaultProtocol: 'https://'
	};

	static propTypes = {
		/**
		 * Called to approve account access for a given hostname
		 */
		approveHost: PropTypes.func,
		/**
		 * Map of hostnames with approved account access
		 */
		approvedHosts: PropTypes.object,
		/**
		 * Protocol string to append to URLs that have none
		 */
		defaultProtocol: PropTypes.string,
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * A string representing the network name
		 */
		networkType: PropTypes.string,
		/**
		 * Indicates whether privacy mode is enabled
		 */
		privacyMode: PropTypes.bool,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Url coming from an external source
		 * For ex. deeplinks
		 */
		url: PropTypes.string,
		/**
		 * Function to store bookmarks
		 */
		addBookmark: PropTypes.func,
		/**
		 * Array of bookmarks
		 */
		bookmarks: PropTypes.array,
		/**
		 * String representing the current search engine
		 */
		searchEngine: PropTypes.string,
		/**
		 * Function to store the a page in the browser history
		 */
		addToBrowserHistory: PropTypes.func
	};

	state = {
		appState: 'active',
		approvedOrigin: false,
		canGoBack: false,
		canGoForward: false,
		currentEnsName: null,
		currentPageTitle: '',
		currentPageUrl: '',
		currentPageIcon: undefined,
		editMode: false,
		entryScriptWeb3: null,
		fullHostname: '',
		hostname: '',
		inputValue: '',
		ipfsGateway: 'https://ipfs.io/ipfs/',
		ipfsHash: null,
		ipfsWebsite: false,
		loading: true,
		showApprovalDialog: false,
		signMessage: false,
		signMessageParams: { data: '' },
		signType: '',
		timeout: false,
		url: this.props.url || ''
	};

	webview = React.createRef();
	inputRef = React.createRef();
	scrollY = new Animated.Value(0);
	timeoutHandler = null;
	prevScrollOffset = 0;
	approvalRequest;

	async componentDidMount() {
		this.backgroundBridge = new BackgroundBridge(Engine, this.webview, {
			eth_requestAccounts: ({ hostname, params }) => {
				const { approvedHosts, privacyMode, selectedAddress } = this.props;
				const promise = new Promise((resolve, reject) => {
					this.approvalRequest = { resolve, reject };
				});
				if (!privacyMode || ((!params || !params.force) && approvedHosts[hostname])) {
					this.approvalRequest.resolve([selectedAddress]);
					this.backgroundBridge.enableAccounts();
				} else {
					this.setState({ showApprovalDialog: true });
				}
				return promise;
			},
			web3_clientVersion: payload =>
				Promise.resolve({ result: 'MetaMask/0.1.0/Alpha/Mobile', jsonrpc: payload.jsonrpc, id: payload.id }),
			wallet_scanQRCode: payload => {
				const promise = new Promise((resolve, reject) => {
					this.props.navigation.navigate('QRScanner', {
						onScanSuccess: data => {
							let result = data;
							if (data.target_address) {
								result = data.target_address;
							} else if (data.scheme) {
								result = JSON.stringify(data);
							}
							resolve({ result, jsonrpc: payload.jsonrpc, id: payload.id });
						},
						onScanError: e => {
							reject({ errir: e.toString(), jsonrpc: payload.jsonrpc, id: payload.id });
						}
					});
				});
				return promise;
			}
		});

		const entryScriptWeb3 =
			Platform.OS === 'ios'
				? await RNFS.readFile(`${RNFS.MainBundlePath}/InpageBridgeWeb3.js`, 'utf8')
				: await RNFS.readFileAssets(`InpageBridgeWeb3.js`);

		const updatedentryScriptWeb3 = entryScriptWeb3.replace(
			'undefined; // INITIAL_NETWORK',
			`'${Networks[this.props.networkType].networkId.toString()}'`
		);

		const SPA_urlChangeListener = `(function () {
			var __mmHistory = window.history;
			var __mmPushState = __mmHistory.pushState;
			__mmHistory.pushState = function(state) {
				setTimeout(function () {
					const siteName = document.querySelector('head > meta[property="og:site_name"]');
					const title = siteName || document.querySelector('head > meta[name="title"]');
					window.postMessageToNative(
						{
							type: 'NAV_CHANGE',
							payload: {
								url: location.href,
								title: title
							}
						}
					);
				}, 100);
				return __mmPushState.apply(history, arguments);
			};
		  })();
  		`;

		await this.setState({ entryScriptWeb3: updatedentryScriptWeb3 + SPA_urlChangeListener });

		Engine.context.TransactionController.hub.on('unapprovedTransaction', transactionMeta => {
			this.props.navigation.push('ApprovalView', { transactionMeta });
		});
		Engine.context.PersonalMessageManager.hub.on('unapprovedMessage', messageParams => {
			this.setState({ signMessage: true, signMessageParams: messageParams, signType: 'personal' });
		});
		Engine.context.TypedMessageManager.hub.on('unapprovedMessage', messageParams => {
			this.setState({ signMessage: true, signMessageParams: messageParams, signType: 'typed' });
		});
		this.loadUrl();
	}

	async loadUrl() {
		const { navigation } = this.props;
		if (navigation) {
			const url = navigation.getParam('url', null);
			const silent = navigation.getParam('silent', false);
			if (url && !silent) {
				await this.go(url);
				this.setState({ loading: false });
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
				this.loadUrl();
			}
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		// Remove all Engine listeners
		Engine.context.TransactionController.hub.removeAllListeners();
		Engine.context.PersonalMessageManager.hub.removeAllListeners();
		Engine.context.TypedMessageManager.hub.removeAllListeners();
	}

	isENSUrl(url) {
		const urlObj = new URL(url);
		const { hostname } = urlObj;
		const tld = hostname.split('.').pop();
		if (SUPPORTED_TOP_LEVEL_DOMAINS.indexOf(tld.toLowerCase()) !== -1) {
			return true;
		}
		return false;
	}

	go = async url => {
		const hasProtocol = url.match(/^[a-z]*:\/\//);
		const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
		const urlObj = new URL(sanitizedURL);
		const { hostname, query, pathname } = urlObj;

		let ipfsContent = null;
		let currentEnsName = null;
		let ipfsHash = null;

		if (this.isENSUrl(sanitizedURL)) {
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
			ipfsWebsite: !!ipfsContent,
			inputValue: sanitizedURL,
			currentEnsName,
			ipfsHash,
			hostname: this.formatHostname(hostname)
		});

		this.timeoutHandler && clearTimeout(this.timeoutHandler);
		this.timeoutHandler = setTimeout(() => {
			this.urlTimedOut(urlToGo);
		}, 60000);

		return sanitizedURL;
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

		const gatewayUrl = `${this.state.ipfsGateway}${ipfsHash}${pathname || '/'}${query || ''}`;

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
			return `https://ipfs.io/ipfs/${ipfsHash}/`;
		}
	}

	onUrlInputSubmit = async (input = null) => {
		const inputValue = (typeof input === 'string' && input) || this.state.inputValue;
		const { defaultProtocol, searchEngine } = this.props;
		const sanitizedInput = onUrlSubmit(inputValue, searchEngine, defaultProtocol);
		const url = await this.go(sanitizedInput);
		this.hideUrlModal(url);
	};

	goBack = () => {
		this.toggleOptionsIfNeeded();
		if (this.state.canGoBack) {
			const { current } = this.webview;
			current && current.goBack();
		}
	};

	close = () => {
		this.toggleOptionsIfNeeded();
		this.props.navigation.pop();
	};

	goForward = () => {
		this.toggleOptionsIfNeeded();
		const { current } = this.webview;
		current && current.goForward();
	};

	reload = () => {
		this.toggleOptionsIfNeeded();
		const { current } = this.webview;
		current && current.reload();
	};

	bookmark = () => {
		this.toggleOptionsIfNeeded();
		// Check it doesn't exist already
		if (this.props.bookmarks.filter(i => i.url === this.state.inputValue).length) {
			Alert.alert(strings('browser.error'), strings('browser.bookmark_already_exists'));
			return false;
		}

		this.props.navigation.push('AddBookmark', {
			title: this.state.currentPageTitle || '',
			url: this.state.inputValue,
			onAddBookmark: async ({ name, url }) => {
				this.props.addBookmark({ name, url });
			}
		});
	};

	share = () => {
		this.toggleOptionsIfNeeded();
		Share.open({
			url: this.state.inputValue
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	openInBrowser = () => {
		this.toggleOptionsIfNeeded();
		Linking.openURL(this.state.inputValue).catch(error =>
			Logger.log('Error while trying to open external link: ${url}', error)
		);
	};

	toggleOptionsIfNeeded() {
		if (this.props.navigation && this.props.navigation.state.params.showOptions) {
			this.toggleOptions();
		}
	}

	toggleOptions = () => {
		this.props.navigation &&
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				showOptions: !this.props.navigation.state.params.showOptions
			});
	};

	onMessage = ({ nativeEvent: { data } }) => {
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;
			if (!data || !data.type) {
				return;
			}
			switch (data.type) {
				case 'NAV_CHANGE':
					this.setState({ inputValue: data.payload.url, currentPageTitle: data.payload.title });
					this.props.navigation.setParams({ url: data.payload.url, silent: true, showUrlModal: false });
					break;
				case 'INPAGE_REQUEST':
					this.backgroundBridge.onMessage(data);
					break;
				case 'GET_TITLE_FOR_BOOKMARK':
					if (data.payload.title) {
						this.setState({
							currentPageTitle: data.payload.title,
							currentPageUrl: data.payload.url,
							currentPageIcon: data.payload.icon
						});
					}
					break;
			}
		} catch (e) {
			Logger.error(`Browser::onMessage on ${this.state.inputValue}`, e.toString());
		}
	};

	onPageChange = ({ canGoBack, canGoForward, url }) => {
		const data = { canGoBack, canGoForward };
		const urlObj = new URL(url);
		data.fullHostname = urlObj.hostname;
		if (!this.state.ipfsWebsite) {
			data.inputValue = url;
		} else if (url.search('mm_override=false') === -1) {
			data.inputValue = url.replace(
				`${this.state.ipfsGateway}${this.state.ipfsHash}/`,
				`https://${this.state.currentEnsName}/`
			);
		} else if (this.isENSUrl(url)) {
			this.go(url);
			return;
		} else {
			data.inputValue = url;
			data.hostname = this.formatHostname(urlObj.hostname);
		}

		const { fullHostname, inputValue, hostname } = data;
		if (fullHostname !== this.state.fullHostname) {
			this.props.navigation.setParams({ url, silent: true, showUrlModal: false });
		}

		this.setState({ canGoBack, canGoForward, fullHostname, inputValue, hostname });
	};

	formatHostname(hostname) {
		return hostname.toLowerCase().replace('www.', '');
	}

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
		const { approvedHosts, privacyMode } = this.props;
		if (!privacyMode || approvedHosts[this.state.fullHostname]) {
			this.backgroundBridge.enableAccounts();
		}

		// Wait for the title, then store the visit
		setTimeout(() => {
			// Check if it's already in the
			this.props.addToBrowserHistory({
				name: this.state.currentPageTitle,
				url: this.state.inputValue
			});
		}, 1000);

		// We need to get the title of the page first
		const { current } = this.webview;
		const js = `
			(function () {
				const shortcutIcon = window.document.querySelector('head > link[rel="shortcut icon"]');
				const icon = shortcutIcon || Array.from(window.document.querySelectorAll('head > link[rel="icon"]')).find((icon) => Boolean(icon.href));

				const siteName = document.querySelector('head > meta[property="og:site_name"]');
				const title = siteName || document.querySelector('head > meta[name="title"]');

				window.postMessageToNative(
					{
						type: 'GET_TITLE_FOR_BOOKMARK',
						payload: {
							__mmID: 1,
							title: title ? title.content : document.title,
							url: location.href,
							icon: icon && icon.href
						}
					}
				)
			})();
		`;
		Platform.OS === 'ios' ? current.evaluateJavaScript(js) : current.injectJavaScript(js);
		clearTimeout(this.timeoutHandler);
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	renderOptions = () => {
		const showOptions = (this.props.navigation && this.props.navigation.getParam('showOptions', false)) || false;
		if (showOptions) {
			return (
				<TouchableWithoutFeedback onPress={this.toggleOptions}>
					<View style={styles.optionsOverlay}>
						<View
							style={[
								styles.optionsWrapper,
								Platform.OS === 'android' ? styles.optionsWrapperAndroid : styles.optionsWrapperIos
							]}
						>
							{Platform.OS === 'android' && this.state.canGoBack ? (
								<Button onPress={this.goBack} style={styles.option}>
									<Icon name="arrow-left" size={15} style={styles.optionIcon} />
									<Text style={styles.optionText}>{strings('browser.go_back')}</Text>
								</Button>
							) : null}
							{Platform.OS === 'android' && this.state.canGoForward ? (
								<Button onPress={this.goForward} style={styles.option}>
									<Icon name="arrow-right" size={15} style={styles.optionIcon} />
									<Text style={styles.optionText}>{strings('browser.go_forward')}</Text>
								</Button>
							) : null}
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
							<Button onPress={this.openInBrowser} style={styles.option}>
								<Icon name="expand" size={15} style={styles.optionIcon} />
								<Text style={styles.optionText}>{strings('browser.open_in_browser')}</Text>
							</Button>
							{Platform.OS === 'android' ? (
								<Button onPress={this.close} style={styles.option}>
									<Icon name="close" size={15} style={styles.optionIcon} />
									<Text style={styles.optionText}>{strings('browser.close')}</Text>
								</Button>
							) : null}
						</View>
					</View>
				</TouchableWithoutFeedback>
			);
		}
	};

	handleScroll = e => {
		if (this.state.progress < 1) {
			return;
		}

		const newOffset = e.contentOffset.y;
		// Avoid wrong position at the beginning
		if (this.prevScrollOffset === 0 && newOffset > SCROLL_THRESHOLD) {
			return;
		}

		// In case they scroll past the top
		if (newOffset <= 0) {
			this.scrollY.setValue(0);
			return;
		}

		const diff = Math.abs(newOffset - this.prevScrollOffset);
		let newAnimatedValue = Math.max(0, Math.min(SCROLL_THRESHOLD, diff) / SCROLL_THRESHOLD);
		if (newOffset < this.prevScrollOffset) {
			// moving down
			newAnimatedValue = 1 - newAnimatedValue;
		}
		this.scrollY.setValue(newAnimatedValue);
	};

	onScrollEnd = e => {
		this.prevScrollOffset = e.contentOffset.y;
	};

	onScrollBeginDrag = e => {
		setTimeout(() => {
			this.prevScrollOffset = e.contentOffset.y;
		}, 150);
	};

	renderBottomBar = (canGoBack, canGoForward) => {
		const bottom = Platform.OS === 'ios' ? 0 : 10;
		const distance = Platform.OS === 'ios' ? 100 : 200;
		const bottomBarPosition = Animated.diffClamp(this.scrollY, 0, SCROLL_THRESHOLD).interpolate({
			inputRange: [0, 1],
			outputRange: [bottom, bottom - distance]
		});
		return (
			<Animated.View style={[styles.bottomBar, { marginBottom: bottomBarPosition }]}>
				<View style={styles.iconsLeft}>
					<Icon
						name="angle-left"
						disabled={!canGoBack}
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
				</View>
				<View style={styles.iconsRight}>
					<MaterialIcon
						name="more-vert"
						onPress={this.toggleOptions}
						size={20}
						style={[styles.icon, styles.iconMore]}
					/>
				</View>
			</Animated.View>
		);
	};

	isHttps() {
		return this.state.inputValue.toLowerCase().substr(0, 6) === 'https:';
	}

	hideUrlModal = url => {
		const urlParam = typeof url === 'string' ? url : this.props.navigation.state.params.url;
		this.props.navigation.setParams({ url: urlParam, showUrlModal: false });
	};

	clearInputText = () => {
		const { current } = this.inputRef;
		current.clear();
	};

	onAutocomplete = link => {
		this.setState({ inputValue: link }, () => {
			this.onUrlInputSubmit(link);
		});
	};

	renderUrlModal = () => {
		const showUrlModal = (this.props.navigation && this.props.navigation.getParam('showUrlModal', false)) || false;

		if (showUrlModal && this.inputRef) {
			setTimeout(() => {
				const { current } = this.inputRef;
				if (current && !current.isFocused()) {
					current.focus();
				}
			}, 300);
		}

		return (
			<Modal
				isVisible={showUrlModal}
				style={styles.urlModal}
				onBackdropPress={this.hideUrlModal}
				animationIn="slideInDown"
				animationOut="slideOutUp"
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
			>
				<View style={styles.urlModalContent}>
					<TextInput
						ref={this.inputRef}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						onChangeText={this.onURLChange}
						onSubmitEditing={this.onUrlInputSubmit}
						placeholder="Enter website address"
						placeholderTextColor={colors.asphalt}
						returnKeyType="go"
						style={styles.urlInput}
						value={this.state.inputValue}
						selectTextOnFocus
					/>

					{Platform.OS === 'android' ? (
						<TouchableOpacity onPress={this.clearInputText} style={styles.iconCloseButton}>
							<MaterialIcon name="close" size={20} style={[styles.icon, styles.iconClose]} />
						</TouchableOpacity>
					) : (
						<TouchableOpacity style={styles.cancelButton} onPress={this.hideUrlModal}>
							<Text style={styles.cancelButtonText}>{strings('browser.cancel')}</Text>
						</TouchableOpacity>
					)}
				</View>
				<UrlAutocomplete onSubmit={this.onAutocomplete} input={this.state.inputValue} />
			</Modal>
		);
	};

	onSignAction = () => {
		this.setState({ signMessage: false });
	};

	renderSigningModal = () => {
		const { signMessage, signMessageParams, signType, currentPageTitle, currentPageUrl } = this.state;
		return (
			<Modal
				isVisible={signMessage}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onSignAction}
			>
				{signType === 'personal' && (
					<PersonalSign
						messageParams={signMessageParams}
						onCancel={this.onSignAction}
						onConfirm={this.onSignAction}
						currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					/>
				)}
				{signType === 'typed' && (
					<TypedSign
						messageParams={signMessageParams}
						onCancel={this.onSignAction}
						onConfirm={this.onSignAction}
						currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					/>
				)}
			</Modal>
		);
	};

	onAccountsConfirm = () => {
		const { approveHost, selectedAddress } = this.props;
		this.setState({ showApprovalDialog: false });
		approveHost(this.state.fullHostname);
		this.backgroundBridge.enableAccounts();
		this.approvalRequest.resolve([selectedAddress]);
	};

	onAccountsReject = () => {
		this.setState({ showApprovalDialog: false });
		this.approvalRequest.reject('User rejected account access');
	};

	renderApprovalModal = () => {
		const { showApprovalDialog, currentPageTitle, currentPageUrl, currentPageIcon } = this.state;
		return (
			<Modal
				isVisible={showApprovalDialog}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
			>
				<AccountApproval
					onCancel={this.onAccountsReject}
					onConfirm={this.onAccountsConfirm}
					currentPageInformation={{ title: currentPageTitle, url: currentPageUrl, icon: currentPageIcon }}
				/>
			</Modal>
		);
	};

	getUserAgent() {
		if (Platform.OS === 'android') {
			return 'Mozilla/5.0 (Linux; Android 8.1.0; Android SDK built for x86 Build/OSM1.180201.023) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.98 Mobile Safari/537.36';
		}
		return null;
	}

	onLoadStart = () => {
		this.backgroundBridge.disableAccounts();
	};

	render = () => {
		const { canGoBack, canGoForward, entryScriptWeb3, url } = this.state;

		return (
			<SafeAreaView style={styles.wrapper}>
				<View style={styles.progressBarWrapper}>
					<WebviewProgressBar progress={this.state.progress} />
				</View>
				{entryScriptWeb3 && !this.state.loading ? (
					<Web3Webview
						injectedOnStartLoadingJavaScript={entryScriptWeb3}
						injectedJavaScriptForMainFrameOnly
						onProgress={this.onLoadProgress}
						onLoadStart={this.onLoadStart}
						onLoadEnd={this.onLoadEnd}
						onMessage={this.onMessage}
						onNavigationStateChange={this.onPageChange}
						ref={this.webview}
						source={{ uri: url }}
						style={styles.webview}
						scrollEventThrottle={16}
						onScroll={this.handleScroll}
						onScrollBeginDrag={this.onScrollBeginDrag}
						onScrollEndDrag={this.onScrollEnd}
						onMomentumScrollEnd={this.onScrollEnd}
						userAgent={this.getUserAgent()}
						sendCookies
						javascriptEnabled
					/>
				) : (
					this.renderLoader()
				)}
				{this.renderUrlModal()}
				{this.renderSigningModal()}
				{this.renderApprovalModal()}
				{this.renderOptions()}
				{Platform.OS === 'ios' ? this.renderBottomBar(canGoBack, canGoForward) : null}
			</SafeAreaView>
		);
	};
}

const mapStateToProps = state => ({
	approvedHosts: state.privacy.approvedHosts,
	bookmarks: state.bookmarks,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	privacyMode: state.privacy.privacyMode,
	searchEngine: state.settings.searchEngine
});

const mapDispatchToProps = dispatch => ({
	approveHost: hostname => dispatch(approveHost(hostname)),
	addBookmark: bookmark => dispatch(addBookmark(bookmark)),
	addToBrowserHistory: ({ url, name }) => dispatch(addToHistory({ url, name }))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Browser);
