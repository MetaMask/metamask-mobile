import React, { PureComponent } from 'react';
import {
	Text,
	ActivityIndicator,
	Platform,
	StyleSheet,
	TextInput,
	View,
	TouchableWithoutFeedback,
	Alert,
	TouchableOpacity,
	Linking,
	Keyboard,
	BackHandler,
	InteractionManager
} from 'react-native';
// eslint-disable-next-line import/named
import { withNavigation } from 'react-navigation';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrowserBottomBar from '../../UI/BrowserBottomBar';
import PropTypes from 'prop-types';
import RNFS from 'react-native-fs';
import Share from 'react-native-share'; // eslint-disable-line  import/default
import { connect } from 'react-redux';
import BackgroundBridge from '../../../core/BackgroundBridge';
import Engine from '../../../core/Engine';
import PhishingModal from '../../UI/PhishingModal';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import Networks from '../../../util/networks';
import Logger from '../../../util/Logger';
import onUrlSubmit, { getHost, getUrlObj } from '../../../util/browser';
import { SPA_urlChangeListener, JS_WINDOW_INFORMATION, JS_DESELECT_TEXT } from '../../../util/browserScripts';
import resolveEnsToIpfsContentId from '../../../lib/ens-ipfs/resolver';
import Button from '../../UI/Button';
import { strings } from '../../../../locales/i18n';
import URL from 'url-parse';
import Modal from 'react-native-modal';
import UrlAutocomplete from '../../UI/UrlAutocomplete';
import AccountApproval from '../../UI/AccountApproval';
import WebviewError from '../../UI/WebviewError';
import { approveHost } from '../../../actions/privacy';
import { addBookmark, removeBookmark } from '../../../actions/bookmarks';
import { addToHistory, addToWhitelist } from '../../../actions/browser';
import DeviceSize from '../../../util/DeviceSize';
import AppConstants from '../../../core/AppConstants';
import SearchApi from 'react-native-search-api';
import DeeplinkManager from '../../../core/DeeplinkManager';
import Branch from 'react-native-branch';
import WatchAssetRequest from '../../UI/WatchAssetRequest';
import Analytics from '../../../core/Analytics';
import ANALYTICS_EVENT_OPTS from '../../../util/analytics';
import { resemblesAddress } from '../../../util/address';
import { toggleNetworkModal } from '../../../actions/modals';
import setOnboardingWizardStep from '../../../actions/wizard';
import OnboardingWizard from '../../UI/OnboardingWizard';
import BackupAlert from '../../UI/BackupAlert';
import DrawerStatusTracker from '../../../core/DrawerStatusTracker';

const { HOMEPAGE_URL, USER_AGENT } = AppConstants;
const HOMEPAGE_HOST = 'home.metamask.io';

const styles = StyleSheet.create({
	wrapper: {
		...baseStyles.flexGrow,
		backgroundColor: colors.white
	},
	hide: {
		flex: 0,
		opacity: 0,
		display: 'none',
		width: 0,
		height: 0
	},
	progressBarWrapper: {
		height: 3,
		width: '100%',
		left: 0,
		right: 0,
		top: 0,
		position: 'absolute',
		zIndex: 999999
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
		width: 200,
		borderWidth: 1,
		borderColor: colors.grey100,
		backgroundColor: colors.white,
		borderRadius: 10,
		paddingBottom: 5,
		paddingTop: 10
	},
	optionsWrapperAndroid: {
		shadowColor: colors.grey400,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		bottom: 65,
		right: 5
	},
	optionsWrapperIos: {
		shadowColor: colors.grey400,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.5,
		shadowRadius: 3,
		bottom: 90,
		right: 5
	},
	option: {
		paddingVertical: 10,
		height: 44,
		paddingHorizontal: 15,
		backgroundColor: colors.white,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		marginTop: Platform.OS === 'android' ? 0 : -5
	},
	optionText: {
		fontSize: 16,
		lineHeight: 16,
		alignSelf: 'center',
		justifyContent: 'center',
		marginTop: 3,
		color: colors.blue,
		...fontStyles.fontPrimary
	},
	optionIconWrapper: {
		flex: 0,
		borderRadius: 5,
		backgroundColor: colors.blue000,
		padding: 3,
		marginRight: 10,
		alignSelf: 'center'
	},
	optionIcon: {
		color: colors.blue,
		textAlign: 'center',
		alignSelf: 'center',
		fontSize: 18
	},
	webview: {
		...baseStyles.flexGrow,
		zIndex: 1
	},
	urlModalContent: {
		flexDirection: 'row',
		paddingTop: Platform.OS === 'android' ? 10 : DeviceSize.isIphoneX() ? 50 : 27,
		paddingHorizontal: 10,
		backgroundColor: colors.white,
		height: Platform.OS === 'android' ? 59 : DeviceSize.isIphoneX() ? 87 : 65
	},
	urlModal: {
		justifyContent: 'flex-start',
		margin: 0
	},
	urlInput: {
		...fontStyles.normal,
		backgroundColor: Platform.OS === 'android' ? colors.white : colors.grey000,
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
		color: colors.blue,
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
	},
	fullScreenModal: {
		flex: 1
	},
	backupAlert: {
		zIndex: 99999999,
		position: 'absolute',
		bottom: Platform.OS === 'ios' ? (DeviceSize.isIphoneX() ? 100 : 90) : 70,
		left: 16,
		right: 16
	}
});

/**
 * Complete Web browser component with URL entry and history management
 * which represents an individual tab inside the <Browser /> component
 */
export class BrowserTab extends PureComponent {
	static defaultProps = {
		defaultProtocol: 'https://'
	};

	static propTypes = {
		/**
		 * The ID of the current tab
		 */
		id: PropTypes.number,
		/**
		 * The ID of the active tab
		 */
		activeTab: PropTypes.number,
		/**
		 * InitialUrl
		 */
		initialUrl: PropTypes.string,
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
		 * A string that of the chosen ipfs gateway
		 */
		ipfsGateway: PropTypes.string,
		/**
		 * Object containing the information for the current transaction
		 */
		transaction: PropTypes.object,
		/**
		 * react-navigation object used to switch between screens
		 */
		navigation: PropTypes.object,
		/**
		 * A string representing the network type
		 */
		networkType: PropTypes.string,
		/**
		 * A string representing the network id
		 */
		network: PropTypes.string,
		/**
		 * Indicates whether privacy mode is enabled
		 */
		privacyMode: PropTypes.bool,
		/**
		 * A string that represents the selected address
		 */
		selectedAddress: PropTypes.string,
		/**
		 * whitelisted url to bypass the phishing detection
		 */
		whitelist: PropTypes.array,
		/**
		 * Url coming from an external source
		 * For ex. deeplinks
		 */
		url: PropTypes.string,
		/**
		 * Function to toggle the network switcher modal
		 */
		toggleNetworkModal: PropTypes.func,
		/**
		 * Function to open a new tab
		 */
		newTab: PropTypes.func,
		/**
		 * Function to store bookmarks
		 */
		addBookmark: PropTypes.func,
		/**
		 * Function to remove bookmarks
		 */
		removeBookmark: PropTypes.func,
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
		addToBrowserHistory: PropTypes.func,
		/**
		 * Function to store the a website in the browser whitelist
		 */
		addToWhitelist: PropTypes.func,
		/**
		 * Function to update the tab information
		 */
		updateTabInfo: PropTypes.func,
		/**
		 * Function to update the tab information
		 */
		showTabs: PropTypes.func,
		/**
		 * Action to set onboarding wizard step
		 */
		setOnboardingWizardStep: PropTypes.func,
		/**
		 * Current onboarding wizard step
		 */
		wizardStep: PropTypes.number,
		/**
		 * redux flag that indicates if the user set a password
		 */
		passwordSet: PropTypes.bool,
		/**
		 * redux flag that indicates if the user
		 * completed the seed phrase backup flow
		 */
		seedphraseBackedUp: PropTypes.bool,
		/**
		 * the current version of the app
		 */
		app_version: PropTypes.string
	};

	constructor(props) {
		super(props);

		this.state = {
			approvedOrigin: false,
			currentEnsName: null,
			currentPageTitle: '',
			currentPageUrl: '',
			currentPageIcon: undefined,
			entryScriptWeb3: null,
			homepageScripts: null,
			fullHostname: '',
			hostname: '',
			inputValue: props.initialUrl || HOMEPAGE_URL,
			autocompleteInputValue: '',
			ipfsGateway: AppConstants.IPFS_DEFAULT_GATEWAY_URL,
			contentId: null,
			ipfsWebsite: false,
			showApprovalDialog: false,
			showPhishingModal: false,
			timeout: false,
			url: null,
			contentHeight: 0,
			forwardEnabled: false,
			forceReload: false,
			suggestedAssetMeta: undefined,
			watchAsset: false,
			activated: props.id === props.activeTab,
			lastError: null,
			showApprovalDialogHostname: undefined
		};
	}

	webview = React.createRef();
	inputRef = React.createRef();
	sessionENSNames = {};
	ensIgnoreList = [];
	snapshotTimer = null;
	lastUrlBeforeHome = null;
	goingBack = false;
	wizardScrollAdjusted = false;
	isReloading = false;
	approvalRequest;
	accountsRequest;

	/**
	 * Check that page metadata is available and call callback
	 * if not, get metadata first
	 */
	checkForPageMeta = callback => {
		const { currentPageTitle } = this.state;
		if (!currentPageTitle || currentPageTitle !== {}) {
			// We need to get the title to add bookmark
			const { current } = this.webview;
			current && current.injectJavaScript(JS_WINDOW_INFORMATION);
		}
		setTimeout(() => {
			callback();
		}, 500);
	};

	getPageMeta() {
		return new Promise(resolve => {
			this.checkForPageMeta(() =>
				resolve({
					meta: {
						title: this.state.currentPageTitle || '',
						url: this.state.currentPageUrl || ''
					}
				})
			);
		});
	}

	async componentDidMount() {
		this.mounted = true;
		if (this.isTabActive()) {
			this.initialReload();
			return;
		} else if (this.isTabActive() && this.isENSUrl(this.state.url)) {
			this.go(this.state.inputValue);
		}

		this.init();
	}

	initializeBackgroundBridge = () => {
		this.backgroundBridge = new BackgroundBridge(Engine, this.webview, {
			eth_sign: async payload => {
				const { MessageManager } = Engine.context;
				try {
					const pageMeta = await this.getPageMeta();
					const rawSig = await MessageManager.addUnapprovedMessageAsync({
						data: payload.params[1],
						from: payload.params[0],
						...pageMeta
					});

					return (
						!this.isReloading &&
						Promise.resolve({ result: rawSig, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				} catch (error) {
					return (
						!this.isReloading &&
						Promise.reject({ error: error.message, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				}
			},
			personal_sign: async payload => {
				const { PersonalMessageManager } = Engine.context;
				try {
					const firstParam = payload.params[0];
					const secondParam = payload.params[1];
					const params = {
						data: firstParam,
						from: secondParam
					};
					if (resemblesAddress(firstParam) && !resemblesAddress(secondParam)) {
						params.data = secondParam;
						params.from = firstParam;
					}
					const pageMeta = await this.getPageMeta();
					const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
						...params,
						...pageMeta
					});
					return (
						!this.isReloading &&
						Promise.resolve({ result: rawSig, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				} catch (error) {
					return (
						!this.isReloading &&
						Promise.reject({ error: error.message, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				}
			},
			eth_signTypedData: async payload => {
				const { TypedMessageManager } = Engine.context;
				try {
					const pageMeta = await this.getPageMeta();
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: payload.params[0],
							from: payload.params[1],
							...pageMeta
						},
						'V1'
					);
					return (
						!this.isReloading &&
						Promise.resolve({ result: rawSig, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				} catch (error) {
					return (
						!this.isReloading &&
						Promise.reject({ error: error.message, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				}
			},
			eth_signTypedData_v3: async payload => {
				const { TypedMessageManager } = Engine.context;

				let data;
				try {
					data = JSON.parse(payload.params[1]);
				} catch (e) {
					throw new Error('Data must be passed as a valid JSON string.');
				}
				const chainId = data.domain.chainId;
				const activeChainId =
					this.props.networkType === 'rpc' ? this.props.network : Networks[this.props.networkType].networkId;

				// eslint-disable-next-line eqeqeq
				if (chainId && chainId != activeChainId) {
					throw new Error(`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`);
				}

				try {
					const pageMeta = await this.getPageMeta();
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: payload.params[1],
							from: payload.params[0],
							...pageMeta
						},
						'V3'
					);
					return (
						!this.isReloading &&
						Promise.resolve({ result: rawSig, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				} catch (error) {
					return (
						!this.isReloading &&
						Promise.reject({ error: error.message, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				}
			},
			eth_signTypedData_v4: async payload => {
				const { TypedMessageManager } = Engine.context;

				let data;
				try {
					data = JSON.parse(payload.params[1]);
				} catch (e) {
					throw new Error('Data must be passed as a valid JSON string.');
				}

				const chainId = data.domain.chainId;
				const activeChainId =
					this.props.networkType === 'rpc' ? this.props.network : Networks[this.props.networkType].networkId;

				if (chainId && chainId !== activeChainId) {
					throw new Error(`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`);
				}

				try {
					const pageMeta = await this.getPageMeta();
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: payload.params[1],
							from: payload.params[0],
							...pageMeta
						},
						'V4'
					);
					return (
						!this.isReloading &&
						Promise.resolve({ result: rawSig, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				} catch (error) {
					return (
						!this.isReloading &&
						Promise.reject({ error: error.message, jsonrpc: payload.jsonrpc, id: payload.id })
					);
				}
			},
			eth_requestAccounts: ({ hostname, params }) => {
				const { approvedHosts, privacyMode, selectedAddress } = this.props;
				const promise = new Promise((resolve, reject) => {
					this.approvalRequest = { resolve, reject };
				});
				if (!privacyMode || ((!params || !params.force) && approvedHosts[hostname])) {
					this.approvalRequest.resolve([selectedAddress]);
					//if not approved previously
					if (!this.backgroundBridge._accounts) {
						this.backgroundBridge.enableAccounts();
					}
				} else {
					// Let the damn website load first!
					// Otherwise we don't get enough time to load the metadata
					// (title, icon, etc)

					setTimeout(async () => {
						await this.getPageMeta();
						this.setState({ showApprovalDialog: true, showApprovalDialogHostname: hostname });
					}, 1000);
				}
				return !this.isReloading && promise;
			},
			eth_accounts: ({ id, jsonrpc, hostname }) => {
				const { approvedHosts, privacyMode, selectedAddress } = this.props;
				const isEnabled = !privacyMode || approvedHosts[hostname];
				const promise = new Promise((resolve, reject) => {
					this.accountsRequest = { resolve, reject };
				});
				if (isEnabled) {
					this.accountsRequest.resolve({ id, jsonrpc, result: [selectedAddress] });
				} else {
					this.accountsRequest.resolve({ id, jsonrpc, result: [] });
				}
				return !this.isReloading && promise;
			},
			net_version: payload =>
				!this.isReloading &&
				Promise.resolve({
					result: `${Networks[this.props.networkType].networkId}`,
					jsonrpc: payload.jsonrpc,
					id: payload.id
				}),
			web3_clientVersion: payload =>
				!this.isReloading &&
				Promise.resolve({
					result: `MetaMask/${this.props.app_version}/Beta/Mobile`,
					jsonrpc: payload.jsonrpc,
					id: payload.id
				}),
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
				return !this.isReloading && promise;
			},
			wallet_watchAsset: async ({ params }) => {
				const {
					options: { address, decimals, image, symbol },
					type
				} = params;
				const { AssetsController } = Engine.context;
				const suggestionResult = await AssetsController.watchAsset({ address, symbol, decimals, image }, type);
				return !this.isReloading && suggestionResult.result;
			},
			metamask_isApproved: async ({ hostname }) =>
				!this.isReloading && {
					isApproved: !!this.props.approvedHosts[hostname]
				},
			metamask_removeFavorite: ({ params }) => {
				const promise = new Promise((resolve, reject) => {
					if (!this.isHomepage()) {
						reject({ error: 'unauthorized' });
					}

					Alert.alert(strings('browser.remove_bookmark_title'), strings('browser.remove_bookmark_msg'), [
						{
							text: strings('browser.cancel'),
							onPress: () => {
								resolve({
									favorites: this.props.bookmarks
								});
							},
							style: 'cancel'
						},
						{
							text: strings('browser.yes'),
							onPress: () => {
								const bookmark = { url: params[0] };
								this.props.removeBookmark(bookmark);
								// remove bookmark from homepage
								this.refreshHomeScripts();
								resolve({
									favorites: this.props.bookmarks
								});
							}
						}
					]);
				});
				return !this.isReloading && promise;
			},
			metamask_showTutorial: () => {
				this.wizardScrollAdjusted = false;
				this.props.setOnboardingWizardStep(1);
				this.props.navigation.navigate('WalletView');

				return !this.isReloading && Promise.resolve({ result: true });
			},
			metamask_showAutocomplete: () => {
				this.fromHomepage = true;
				this.setState(
					{
						autocompleteInputValue: ''
					},
					() => {
						this.showUrlModal(true);
						setTimeout(() => {
							this.fromHomepage = false;
						}, 1500);
					}
				);

				return !this.isReloading && Promise.resolve({ result: true });
			}
		});
	};

	init = async () => {
		const entryScriptWeb3 =
			Platform.OS === 'ios'
				? await RNFS.readFile(`${RNFS.MainBundlePath}/InpageBridgeWeb3.js`, 'utf8')
				: await RNFS.readFileAssets(`InpageBridgeWeb3.js`);

		const updatedentryScriptWeb3 = entryScriptWeb3.replace(
			'undefined; // INITIAL_NETWORK',
			this.props.networkType === 'rpc'
				? `'${this.props.network}'`
				: `'${Networks[this.props.networkType].networkId}'`
		);

		const homepageScripts = `
			window.__mmFavorites = ${JSON.stringify(this.props.bookmarks)};
			window.__mmSearchEngine="${this.props.searchEngine}";
		`;

		await this.setState({ entryScriptWeb3: updatedentryScriptWeb3 + SPA_urlChangeListener, homepageScripts });
		Engine.context.AssetsController.hub.on('pendingSuggestedAsset', suggestedAssetMeta => {
			if (!this.isTabActive()) return false;
			this.setState({ watchAsset: true, suggestedAssetMeta });
		});

		// Deeplink handling
		this.unsubscribeFromBranch = Branch.subscribe(this.handleDeeplinks);
		// Check if there's a deeplink pending from launch
		const pendingDeeplink = DeeplinkManager.getPendingDeeplink();
		if (pendingDeeplink) {
			// Expire it to avoid duplicate actions
			DeeplinkManager.expireDeeplink();
			// Handle it
			setTimeout(() => {
				this.handleBranchDeeplink(pendingDeeplink);
			}, 1000);
		}

		this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide);

		// Listen to network changes
		Engine.context.TransactionController.hub.on('networkChange', this.reload);

		BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBackPress);

		if (Platform.OS === 'android') {
			DrawerStatusTracker.hub.on('drawer::open', this.drawerOpenHandler);
		}

		// Handle hardwareBackPress event only for browser, not components rendered on top
		this.props.navigation.addListener('willFocus', () => {
			BackHandler.addEventListener('hardwareBackPress', this.handleAndroidBackPress);
		});
		this.props.navigation.addListener('willBlur', () => {
			BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBackPress);
		});
	};

	drawerOpenHandler = () => {
		this.dismissTextSelectionIfNeeded();
	};

	handleDeeplinks = async ({ error, params }) => {
		if (!this.isTabActive()) return false;
		if (error) {
			Logger.error('Error from Branch: ', error);
			return;
		}
		if (params['+non_branch_link']) {
			this.handleBranchDeeplink(params['+non_branch_link']);
		} else if (params.spotlight_identifier) {
			setTimeout(() => {
				this.props.navigation.setParams({
					url: params.spotlight_identifier,
					silent: false,
					showUrlModal: false
				});
			}, 1000);
		}
	};

	handleBranchDeeplink(deeplink_url) {
		Logger.log('Branch Deeplink detected!', deeplink_url);
		DeeplinkManager.parse(deeplink_url, url => {
			this.openNewTab(url);
		});
	}

	handleAndroidBackPress = () => {
		if (!this.isTabActive()) return false;

		if (this.isHomepage() && this.props.navigation.getParam('url', null) === null) {
			return false;
		}
		this.goBack();
		return true;
	};

	async loadUrl() {
		if (!this.isTabActive()) return;
		const { navigation } = this.props;
		if (navigation) {
			const url = navigation.getParam('url', null);
			const silent = navigation.getParam('silent', false);
			if (url && !silent) {
				await this.go(url);
			}
		}
	}

	refreshHomeScripts() {
		const homepageScripts = `
			window.__mmFavorites = ${JSON.stringify(this.props.bookmarks)};
			window.__mmSearchEngine="${this.props.searchEngine}";
		`;
		this.setState({ homepageScripts }, () => {
			const { current } = this.webview;
			if (this.isHomepage() && current) {
				current.injectJavaScript(homepageScripts);
			}
		});
	}

	setTabActive() {
		this.setState({ activated: true });
	}

	componentDidUpdate(prevProps) {
		const prevNavigation = prevProps.navigation;
		const { navigation } = this.props;

		// If tab wasn't activated and we detect an tab change
		// we need to check if it's time to activate the tab
		if (!this.state.activated && prevProps.activeTab !== this.props.activeTab) {
			if (this.props.id === this.props.activeTab) {
				this.setTabActive();
			}
		}

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
		Engine.context.AssetsController.hub.removeAllListeners();
		Engine.context.TransactionController.hub.removeListener('networkChange', this.reload);
		this.keyboardDidHideListener && this.keyboardDidHideListener.remove();
		if (Platform.OS === 'android') {
			BackHandler.removeEventListener('hardwareBackPress', this.handleAndroidBackPress);
			DrawerStatusTracker && DrawerStatusTracker.hub && DrawerStatusTracker.hub.removeAllListeners();
		}
		if (this.unsubscribeFromBranch) {
			this.unsubscribeFromBranch();
			this.unsubscribeFromBranch = null;
		}
	}

	keyboardDidHide = () => {
		if (!this.isTabActive()) return false;
		if (!this.fromHomepage) {
			const showUrlModal =
				(this.props.navigation && this.props.navigation.getParam('showUrlModal', false)) || false;
			if (showUrlModal) {
				this.hideUrlModal();
			}
		}
	};

	isENSUrl(url) {
		const { hostname } = new URL(url);
		const tld = hostname.split('.').pop();
		if (AppConstants.supportedTLDs.indexOf(tld.toLowerCase()) !== -1) {
			// Make sure it's not in the ignore list
			if (this.ensIgnoreList.indexOf(hostname) === -1) {
				return true;
			}
		}
		return false;
	}

	isAllowedUrl = hostname => {
		const { PhishingController } = Engine.context;
		const { whitelist } = this.props;
		return (whitelist && whitelist.includes(hostname)) || !PhishingController.test(hostname);
	};

	handleNotAllowedUrl = urlToGo => {
		this.blockedUrl = urlToGo;
		setTimeout(() => {
			this.setState({ showPhishingModal: true });
		}, 500);
	};

	updateTabInfo(url) {
		this.isTabActive() && this.props.updateTabInfo(url, this.props.id);
	}

	go = async url => {
		const hasProtocol = url.match(/^[a-z]*:\/\//) || this.isHomepage(url);
		const sanitizedURL = hasProtocol ? url : `${this.props.defaultProtocol}${url}`;
		const { hostname, query, pathname } = new URL(sanitizedURL);

		let contentId, contentUrl, contentType;
		if (this.isENSUrl(sanitizedURL)) {
			this.resolvingENSUrl = true;
			const { url, type, hash } = await this.handleIpfsContent(sanitizedURL, { hostname, query, pathname });
			contentUrl = url;
			contentType = type;
			contentId = hash;

			// Needed for the navbar to mask the URL
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				currentEnsName: hostname
			});

			this.setENSHostnameForUrl(contentUrl, hostname);

			setTimeout(() => {
				this.resolvingENSUrl = false;
			}, 1000);
		}
		const urlToGo = contentUrl || sanitizedURL;

		if (this.isAllowedUrl(hostname)) {
			this.setState({
				url: urlToGo,
				progress: 0,
				ipfsWebsite: !!contentUrl,
				inputValue: sanitizedURL,
				currentEnsName: hostname,
				contentId,
				contentType,
				hostname: this.formatHostname(hostname),
				fullHostname: hostname
			});

			this.props.navigation.setParams({ url: this.state.inputValue, silent: true });

			this.updateTabInfo(sanitizedURL);
			return sanitizedURL;
		}
		this.handleNotAllowedUrl(urlToGo);
		return null;
	};

	async handleIpfsContent(fullUrl, { hostname, pathname, query }) {
		const { provider } = Engine.context.NetworkController;
		const { ipfsGateway } = this.props;
		let gatewayUrl;
		try {
			const { type, hash } = await resolveEnsToIpfsContentId({ provider, name: hostname });
			if (type === 'ipfs-ns') {
				gatewayUrl = `${ipfsGateway}${hash}${pathname || '/'}${query || ''}`;
				const response = await fetch(gatewayUrl);
				const statusCode = response.status;
				if (statusCode >= 400) {
					Logger.log('Status code ', statusCode, gatewayUrl);
					this.urlNotFound(gatewayUrl);
					return null;
				}
			} else if (type === 'swarm-ns') {
				gatewayUrl = `${AppConstants.SWARM_DEFAULT_GATEWAY_URL}${hash}${pathname || '/'}${query || ''}`;
			}

			return {
				url: gatewayUrl,
				hash,
				type
			};
		} catch (err) {
			// This is a TLD that might be a normal website
			// For example .XYZ and might be more in the future
			if (hostname.substr(-4) !== '.eth' && err.toString().indexOf('is not standard') !== -1) {
				this.ensIgnoreList.push(hostname);
				this.go(fullUrl);
				return { url: null };
			}
			Logger.error('Failed to resolve ENS name', err);
			Alert.alert(strings('browser.error'), strings('browser.failed_to_resolve_ens_name'));
			this.goBack();
		}
	}

	onUrlInputSubmit = async (input = null) => {
		this.toggleOptionsIfNeeded();
		const inputValue = (typeof input === 'string' && input) || this.state.autocompleteInputValue;
		const { defaultProtocol, searchEngine } = this.props;
		if (inputValue !== '') {
			const sanitizedInput = onUrlSubmit(inputValue, searchEngine, defaultProtocol);
			const url = await this.go(sanitizedInput);
			this.hideUrlModal(url);
		} else {
			this.hideUrlModal();
		}
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.BROWSER_SEARCH);
	};

	goBack = () => {
		this.toggleOptionsIfNeeded();
		this.goingBack = true;
		setTimeout(() => {
			this.goingBack = false;
		}, 500);
		const { current } = this.webview;
		current && current.goBack();
		setTimeout(() => {
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				url: this.state.inputValue
			});
		}, 100);
		// Need to wait for nav_change & onPageChanged
		setTimeout(() => {
			this.setState({ forwardEnabled: true });
		}, 1000);
	};

	goBackToHomepage = async () => {
		this.toggleOptionsIfNeeded();
		const lastUrlBeforeHome = this.state.inputValue;
		await this.go(HOMEPAGE_URL);
		if (lastUrlBeforeHome === HOMEPAGE_URL) {
			this.reload();
		} else {
			this.forceReload();
		}
		setTimeout(() => {
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				url: HOMEPAGE_URL
			});
		}, 100);
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_HOME);
		setTimeout(() => {
			this.lastUrlBeforeHome = lastUrlBeforeHome;
			// update bookmarks on homepage
			this.refreshHomeScripts();
		}, 1000);
	};

	goForward = async () => {
		const { current } = this.webview;
		if (this.lastUrlBeforeHome) {
			this.go(this.lastUrlBeforeHome);
		} else if (this.canGoForward()) {
			this.toggleOptionsIfNeeded();
			current && current.goForward && current.goForward();
		}

		const forwardEnabled = current && current.canGoForward && (await current.canGoForward());
		this.setState({ forwardEnabled });
	};

	reload = () => {
		this.toggleOptionsIfNeeded();
		const { current } = this.webview;
		current && current.reload();
	};

	forceReload = () => {
		this.isReloading = true;

		this.toggleOptionsIfNeeded();
		// As we're reloading to other url we should remove this callback
		this.approvalRequest = undefined;
		const url2Reload = this.state.inputValue;
		// Force unmount the webview to avoid caching problems
		this.setState({ forceReload: true }, () => {
			// Make sure we're not calling last mounted webview during this time threshold
			this.webview.current = null;
			setTimeout(() => {
				this.setState({ forceReload: false }, () => {
					this.isReloading = false;
					this.go(url2Reload);
				});
			}, 300);
		});
	};

	initialReload = () => {
		if (this.webview && this.webview.current) {
			this.webview.current.stopLoading();
		}
		this.forceReload();
		this.init();
	};

	addBookmark = () => {
		this.toggleOptionsIfNeeded();
		// Check it doesn't exist already
		if (this.props.bookmarks.filter(i => i.url === this.state.inputValue).length) {
			Alert.alert(strings('browser.error'), strings('browser.bookmark_already_exists'));
			return false;
		}
		this.checkForPageMeta(() =>
			this.props.navigation.push('AddBookmarkView', {
				title: this.state.currentPageTitle || '',
				url: this.state.inputValue,
				onAddBookmark: async ({ name, url }) => {
					this.props.addBookmark({ name, url });
					if (Platform.OS === 'ios') {
						const item = {
							uniqueIdentifier: url,
							title: name || url,
							contentDescription: `Launch ${name || url} on MetaMask`,
							keywords: [name.split(' '), url, 'dapp'],
							thumbnail: { uri: `https://api.faviconkit.com/${getHost(url)}/256` }
						};
						try {
							SearchApi.indexSpotlightItem(item);
						} catch (e) {
							Logger.error('Error adding to spotlight', e);
						}
					}
					const homepageScripts = `
						window.__mmFavorites = ${JSON.stringify(this.props.bookmarks)};
						window.__mmSearchEngine="${this.props.searchEngine}";
					`;
					this.setState({ homepageScripts });
				}
			})
		);
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_ADD_TO_FAVORITE);
	};

	share = () => {
		this.toggleOptionsIfNeeded();
		Share.open({
			url: this.state.inputValue
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	switchNetwork = () => {
		this.toggleOptionsIfNeeded();
		setTimeout(() => {
			this.props.toggleNetworkModal();
		}, 300);
	};

	onNewTabPress = () => {
		this.openNewTab();
	};
	openNewTab = url => {
		this.toggleOptionsIfNeeded();
		setTimeout(() => {
			this.props.newTab(url);
		}, 300);
	};

	openInBrowser = () => {
		this.toggleOptionsIfNeeded();
		Linking.openURL(this.state.inputValue).catch(error =>
			Logger.log('Error while trying to open external link: ${url}', error)
		);
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_OPEN_IN_BROWSER);
	};

	dismissTextSelectionIfNeeded() {
		if (this.isTabActive() && Platform.OS === 'android') {
			const { current } = this.webview;
			if (current) {
				setTimeout(() => {
					current.injectJavaScript(JS_DESELECT_TEXT);
				}, 50);
			}
		}
	}

	toggleOptionsIfNeeded() {
		if (
			this.props.navigation &&
			this.props.navigation.state.params &&
			this.props.navigation.state.params.showOptions
		) {
			this.toggleOptions();
		}
	}

	toggleOptions = () => {
		this.dismissTextSelectionIfNeeded();

		this.props.navigation &&
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				showOptions: !this.props.navigation.state.params.showOptions
			});

		!this.props.navigation.state.params.showOptions &&
			InteractionManager.runAfterInteractions(() => {
				Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_BROWSER_OPTIONS);
			});
	};

	onMessage = ({ nativeEvent: { data } }) => {
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;
			if (!data || !data.type) {
				return;
			}
			switch (data.type) {
				case 'NAV_CHANGE': {
					const { url, title } = data.payload;
					this.setState({
						inputValue: url,
						autocompletInputValue: url,
						currentPageTitle: title,
						forwardEnabled: false
					});
					this.lastUrlBeforeHome = null;
					this.props.navigation.setParams({ url: data.payload.url, silent: true, showUrlModal: false });
					this.updateTabInfo(data.payload.url);
					break;
				}
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

	onPageChange = ({ url }) => {
		if (url === this.state.url) return;
		const { ipfsGateway } = this.props;
		const data = {};
		const urlObj = new URL(url);
		if (urlObj.protocol.indexOf('http') === -1) {
			return;
		}

		if (this.resolvingENSUrl) {
			return;
		}

		this.lastUrlBeforeHome = null;

		if (!this.state.showPhishingModal && !this.isAllowedUrl(urlObj.hostname)) {
			this.handleNotAllowedUrl(url);
		}

		data.fullHostname = urlObj.hostname;

		if (this.isENSUrl(url)) {
			this.go(url);
			const { current } = this.webview;
			current && current.stopLoading();
			return;
		} else if (url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) === -1) {
			if (this.state.contentType === 'ipfs-ns') {
				data.inputValue = url.replace(
					`${ipfsGateway}${this.state.contentId}/`,
					`https://${this.state.currentEnsName}/`
				);
			} else {
				data.inputValue = url.replace(
					`${AppConstants.SWARM_GATEWAY_URL}${this.state.contentId}/`,
					`https://${this.state.currentEnsName}/`
				);
			}
		} else {
			data.inputValue = url;
			data.hostname = this.formatHostname(urlObj.hostname);
		}

		const { fullHostname, inputValue, hostname } = data;
		if (
			fullHostname !== this.state.fullHostname ||
			url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) !== -1
		) {
			if (this.isTabActive()) {
				this.props.navigation.setParams({ url, silent: true, showUrlModal: false });
			}
		}

		this.updateTabInfo(inputValue);
		this.setState({
			fullHostname,
			inputValue,
			autocompleteInputValue: inputValue,
			hostname,
			forwardEnabled: false
		});
	};

	formatHostname(hostname) {
		return hostname.toLowerCase().replace('www.', '');
	}

	onURLChange = inputValue => {
		this.setState({ autocompleteInputValue: inputValue });
	};

	onLoadProgress = ({ nativeEvent: { progress } }) => {
		this.setState({ progress });
	};

	waitForBridgeAndEnableAccounts = async () => {
		while (!this.backgroundBridge) {
			await new Promise(res => setTimeout(() => res(), 1000));
		}
		this.backgroundBridge.enableAccounts();
	};

	onLoadEnd = () => {
		const { approvedHosts, privacyMode } = this.props;
		if (!privacyMode || approvedHosts[this.state.fullHostname]) {
			this.waitForBridgeAndEnableAccounts();
		}

		// Wait for the title, then store the visit
		setTimeout(() => {
			this.props.addToBrowserHistory({
				name: this.state.currentPageTitle,
				url: this.state.inputValue
			});
		}, 500);

		// Let's wait for potential redirects that might break things
		if (!this.initialUrl || this.isHomepage(this.initialUrl)) {
			setTimeout(() => {
				this.initialUrl = this.state.inputValue;
			}, 1000);
		}

		const { current } = this.webview;
		// Inject favorites on the homepage
		if (this.isHomepage() && current) {
			const js = this.state.homepageScripts;
			current.injectJavaScript(js);
		}
	};

	onError = ({ nativeEvent: errorInfo }) => {
		Logger.log(errorInfo);
		this.setState({ lastError: errorInfo });
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
							<Button onPress={this.onNewTabPress} style={styles.option}>
								<View style={styles.optionIconWrapper}>
									<MaterialCommunityIcon name="plus" size={18} style={styles.optionIcon} />
								</View>
								<Text style={styles.optionText} numberOfLines={1}>
									{strings('browser.new_tab')}
								</Text>
							</Button>
							{this.renderNonHomeOptions()}
							<Button onPress={this.switchNetwork} style={styles.option}>
								<View style={styles.optionIconWrapper}>
									<MaterialCommunityIcon name="earth" size={18} style={styles.optionIcon} />
								</View>
								<Text style={styles.optionText} numberOfLines={1}>
									{strings('browser.switch_network')}
								</Text>
							</Button>
						</View>
					</View>
				</TouchableWithoutFeedback>
			);
		}
	};

	renderNonHomeOptions = () => {
		if (this.isHomepage()) return null;

		return (
			<React.Fragment>
				<Button onPress={this.reload} style={styles.option}>
					<View style={styles.optionIconWrapper}>
						<Icon name="refresh" size={15} style={styles.optionIcon} />
					</View>
					<Text style={styles.optionText} numberOfLines={1}>
						{strings('browser.reload')}
					</Text>
				</Button>
				<Button onPress={this.addBookmark} style={styles.option}>
					<View style={styles.optionIconWrapper}>
						<Icon name="star" size={16} style={styles.optionIcon} />
					</View>
					<Text style={styles.optionText} numberOfLines={1}>
						{strings('browser.add_to_favorites')}
					</Text>
				</Button>
				<Button onPress={this.share} style={styles.option}>
					<View style={styles.optionIconWrapper}>
						<Icon name="share" size={15} style={styles.optionIcon} />
					</View>
					<Text style={styles.optionText} numberOfLines={1}>
						{strings('browser.share')}
					</Text>
				</Button>
				<Button onPress={this.openInBrowser} style={styles.option}>
					<View style={styles.optionIconWrapper}>
						<Icon name="expand" size={16} style={styles.optionIcon} />
					</View>
					<Text style={styles.optionText} numberOfLines={1}>
						{strings('browser.open_in_browser')}
					</Text>
				</Button>
			</React.Fragment>
		);
	};

	showTabs = () => {
		this.props.showTabs();
	};

	renderBottomBar = () => {
		const canGoBack = !this.isHomepage();
		const canGoForward = this.canGoForward();
		return (
			<BrowserBottomBar
				canGoBack={canGoBack}
				canGoForward={canGoForward}
				goForward={this.goForward}
				goBack={this.goBack}
				showTabs={this.showTabs}
				showUrlModal={this.showUrlModal}
				toggleOptions={this.toggleOptions}
				goHome={this.goBackToHomepage}
			/>
		);
	};

	isHttps() {
		return this.state.inputValue.toLowerCase().substr(0, 6) === 'https:';
	}

	showUrlModal = (home = false) => {
		if (!this.isTabActive()) return false;
		const params = {
			...this.props.navigation.state.params,
			showUrlModal: true
		};

		if (!home) {
			params.url = this.state.inputValue;
			this.setState({ autocompleteInputValue: this.state.inputValue });
		}
		this.props.navigation.setParams(params);
	};

	hideUrlModal = url => {
		const urlParam = typeof url === 'string' && url ? url : this.props.navigation.state.params.url;
		this.props.navigation.setParams({
			...this.props.navigation.state.params,
			url: urlParam,
			showUrlModal: false
		});

		if (this.isHomepage()) {
			const { current } = this.webview;
			const blur = `document.getElementsByClassName('autocomplete-input')[0].blur();`;
			current && current.injectJavaScript(blur);
		}
	};

	clearInputText = () => {
		const { current } = this.inputRef;
		current && current.clear();
	};

	onAutocomplete = link => {
		this.setState({ inputValue: link, autocompleteInputValue: link }, () => {
			this.onUrlInputSubmit(link);
			this.updateTabInfo(link);
		});
	};

	renderProgressBar = () => (
		<View style={styles.progressBarWrapper}>
			<WebviewProgressBar progress={this.state.progress} />
		</View>
	);

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
				onBackButtonPress={this.hideUrlModal}
				animationIn="slideInDown"
				animationOut="slideOutUp"
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				useNativeDriver
			>
				<View style={styles.urlModalContent} testID={'url-modal'}>
					<TextInput
						ref={this.inputRef}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						testID={'url-input'}
						onChangeText={this.onURLChange}
						onSubmitEditing={this.onUrlInputSubmit}
						placeholder={strings('autocomplete.placeholder')}
						placeholderTextColor={colors.grey400}
						returnKeyType="go"
						style={styles.urlInput}
						value={this.state.autocompleteInputValue}
						selectTextOnFocus
					/>

					{Platform.OS === 'android' ? (
						<TouchableOpacity onPress={this.clearInputText} style={styles.iconCloseButton}>
							<MaterialIcon name="close" size={20} style={[styles.icon, styles.iconClose]} />
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={styles.cancelButton}
							testID={'cancel-url-button'}
							onPress={this.hideUrlModal}
						>
							<Text style={styles.cancelButtonText}>{strings('browser.cancel')}</Text>
						</TouchableOpacity>
					)}
				</View>
				<UrlAutocomplete
					onSubmit={this.onAutocomplete}
					input={this.state.autocompleteInputValue}
					onDismiss={this.hideUrlModal}
				/>
			</Modal>
		);
	};

	onCancelWatchAsset = () => {
		this.setState({ watchAsset: false });
	};

	renderWatchAssetModal = () => {
		const { watchAsset, suggestedAssetMeta } = this.state;
		return (
			<Modal
				isVisible={watchAsset}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={600}
				animationOutTiming={600}
				onBackdropPress={this.onCancelWatchAsset}
				onSwipeComplete={this.onCancelWatchAsset}
				swipeDirection={'down'}
				propagateSwipe
			>
				<WatchAssetRequest
					onCancel={this.onCancelWatchAsset}
					onConfirm={this.onCancelWatchAsset}
					suggestedAssetMeta={suggestedAssetMeta}
				/>
			</Modal>
		);
	};

	onAccountsConfirm = () => {
		const { approveHost, selectedAddress } = this.props;
		this.setState({ showApprovalDialog: false, showApprovalDialogHostname: undefined });
		approveHost(this.state.fullHostname);
		this.backgroundBridge.enableAccounts();
		this.approvalRequest && this.approvalRequest.resolve && this.approvalRequest.resolve([selectedAddress]);
	};

	onAccountsReject = () => {
		this.setState({ showApprovalDialog: false, showApprovalDialogHostname: undefined });
		this.approvalRequest &&
			this.approvalRequest.reject &&
			this.approvalRequest.reject('User rejected account access');
	};

	renderApprovalModal = () => {
		const {
			showApprovalDialogHostname,
			currentPageTitle,
			currentPageUrl,
			currentPageIcon,
			inputValue
		} = this.state;
		const url =
			currentPageUrl && currentPageUrl.length && currentPageUrl !== 'localhost' ? currentPageUrl : inputValue;
		const showApprovalDialog =
			this.state.showApprovalDialog && showApprovalDialogHostname === new URL(url).hostname;
		return (
			<Modal
				isVisible={showApprovalDialog}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={this.onAccountsReject}
				onBackdropPress={this.onAccountsReject}
				swipeDirection={'down'}
			>
				<AccountApproval
					onCancel={this.onAccountsReject}
					onConfirm={this.onAccountsConfirm}
					currentPageInformation={{ title: currentPageTitle, url, icon: currentPageIcon }}
				/>
			</Modal>
		);
	};

	goToETHPhishingDetector = () => {
		this.setState({ showPhishingModal: false });
		this.go(`https://github.com/metamask/eth-phishing-detect`);
	};

	continueToPhishingSite = () => {
		const urlObj = new URL(this.blockedUrl);
		this.props.addToWhitelist(urlObj.hostname);
		this.setState({ showPhishingModal: false });
		this.blockedUrl !== this.state.inputValue &&
			setTimeout(() => {
				this.go(this.blockedUrl);
				this.blockedUrl = undefined;
			}, 1000);
	};

	goToEtherscam = () => {
		this.setState({ showPhishingModal: false });
		this.go(`https://etherscamdb.info/domain/meta-mask.com`);
	};

	goToFilePhishingIssue = () => {
		this.setState({ showPhishingModal: false });
		this.go(`https://github.com/metamask/eth-phishing-detect/issues/new`);
	};

	goBackToSafety = () => {
		this.blockedUrl === this.state.inputValue && this.goBack();
		setTimeout(() => {
			this.mounted && this.setState({ showPhishingModal: false });
			this.blockedUrl = undefined;
		}, 500);
	};

	renderPhishingModal() {
		const { showPhishingModal } = this.state;
		return (
			<Modal
				isVisible={showPhishingModal}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.fullScreenModal}
				backdropOpacity={1}
				backdropColor={colors.red}
				animationInTiming={300}
				animationOutTiming={300}
				useNativeDriver
			>
				<PhishingModal
					fullUrl={this.blockedUrl}
					goToETHPhishingDetector={this.goToETHPhishingDetector}
					continueToPhishingSite={this.continueToPhishingSite}
					goToEtherscam={this.goToEtherscam}
					goToFilePhishingIssue={this.goToFilePhishingIssue}
					goBackToSafety={this.goBackToSafety}
				/>
			</Modal>
		);
	}

	getENSHostnameForUrl = url => this.sessionENSNames[url];

	setENSHostnameForUrl = (url, host) => {
		this.sessionENSNames[url] = host;
	};

	onLoadStart = ({ nativeEvent }) => {
		this.initializeBackgroundBridge();
		this.backgroundBridge && this.backgroundBridge.disableAccounts();
		// Handle the scenario when going back
		// from an ENS name
		if (nativeEvent.navigationType === 'backforward' && nativeEvent.url === this.state.inputValue) {
			setTimeout(() => this.goBack(), 500);
		} else if (nativeEvent.url.indexOf(this.props.ipfsGateway) !== -1) {
			const currentEnsName = this.getENSHostnameForUrl(nativeEvent.url);
			if (currentEnsName) {
				this.props.navigation.setParams({
					...this.props.navigation.state.params,
					currentEnsName
				});
			}
		}
	};

	canGoForward = () => this.state.forwardEnabled;

	isTabActive = () => {
		const { activeTab, id } = this.props;
		return activeTab === id;
	};

	isHomepage = (url = null) => {
		const currentPage = url || this.state.inputValue;
		const { host: currentHost, pathname: currentPathname } = getUrlObj(currentPage);
		return currentHost === HOMEPAGE_HOST && currentPathname === '/';
	};

	renderOnboardingWizard = () => {
		const { wizardStep } = this.props;
		if ([6].includes(wizardStep)) {
			if (!this.wizardScrollAdjusted) {
				setTimeout(() => {
					this.forceReload();
				}, 1);
				this.wizardScrollAdjusted = true;
			}
			return <OnboardingWizard navigation={this.props.navigation} coachmarkRef={this.homepageRef} />;
		}
		return null;
	};

	backupAlertPress = () => {
		this.props.navigation.navigate('AccountBackupStep1');
	};

	render() {
		const { entryScriptWeb3, url, forceReload, activated } = this.state;
		const isHidden = !this.isTabActive();

		return (
			<View
				style={[styles.wrapper, isHidden && styles.hide]}
				{...(Platform.OS === 'android' ? { collapsable: false } : {})}
			>
				<View style={styles.webview}>
					{activated && !forceReload && (
						<WebView
							// eslint-disable-next-line react/jsx-no-bind
							renderError={() => (
								<WebviewError error={this.state.lastError} onReload={this.forceReload} />
							)}
							injectedJavaScript={entryScriptWeb3}
							onLoadProgress={this.onLoadProgress}
							onLoadStart={this.onLoadStart}
							onLoadEnd={this.onLoadEnd}
							onError={this.onError}
							onMessage={this.onMessage}
							onNavigationStateChange={this.onPageChange}
							ref={this.webview}
							source={{ uri: url }}
							style={styles.webview}
							userAgent={USER_AGENT}
							sendCookies
							javascriptEnabled
							allowsInlineMediaPlayback
							useWebkit
						/>
					)}
				</View>
				{this.renderProgressBar()}
				{!isHidden && this.renderUrlModal()}
				{!isHidden && this.renderApprovalModal()}
				{!isHidden && this.renderPhishingModal()}
				{!isHidden && this.renderWatchAssetModal()}
				{!isHidden && this.renderOptions()}
				{!isHidden && this.renderBottomBar()}
				{!isHidden && this.renderOnboardingWizard()}
				{!isHidden && this.props.passwordSet && !this.props.seedphraseBackedUp && (
					<BackupAlert onPress={this.backupAlertPress} style={styles.backupAlert} />
				)}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	approvedHosts: state.privacy.approvedHosts,
	bookmarks: state.bookmarks,
	ipfsGateway: state.engine.backgroundState.PreferencesController.ipfsGateway,
	networkType: state.engine.backgroundState.NetworkController.provider.type,
	network: state.engine.backgroundState.NetworkController.network,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress.toLowerCase(),
	privacyMode: state.privacy.privacyMode,
	searchEngine: state.settings.searchEngine,
	whitelist: state.browser.whitelist,
	activeTab: state.browser.activeTab,
	wizardStep: state.wizard.step,
	seedphraseBackedUp: state.user.seedphraseBackedUp,
	passwordSet: state.user.passwordSet
});

const mapDispatchToProps = dispatch => ({
	approveHost: hostname => dispatch(approveHost(hostname)),
	addBookmark: bookmark => dispatch(addBookmark(bookmark)),
	removeBookmark: bookmark => dispatch(removeBookmark(bookmark)),
	addToBrowserHistory: ({ url, name }) => dispatch(addToHistory({ url, name })),
	addToWhitelist: url => dispatch(addToWhitelist(url)),
	toggleNetworkModal: () => dispatch(toggleNetworkModal()),
	setOnboardingWizardStep: step => dispatch(setOnboardingWizardStep(step))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(withNavigation(BrowserTab));
