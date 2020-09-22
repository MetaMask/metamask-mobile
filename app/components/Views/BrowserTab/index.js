import React, { PureComponent } from 'react';
import {
	Text,
	ActivityIndicator,
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
import { WebView } from 'react-native-webview-forked';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrowserBottomBar from '../../UI/BrowserBottomBar';
import PropTypes from 'prop-types';
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
import {
	SPA_urlChangeListener,
	JS_WINDOW_INFORMATION,
	JS_DESELECT_TEXT,
	JS_WEBVIEW_URL
} from '../../../util/browserScripts';
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
import Device from '../../../util/Device';
import AppConstants from '../../../core/AppConstants';
import SearchApi from 'react-native-search-api';
import DeeplinkManager from '../../../core/DeeplinkManager';
import Branch from 'react-native-branch';
import WatchAssetRequest from '../../UI/WatchAssetRequest';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import { toggleNetworkModal } from '../../../actions/modals';
import setOnboardingWizardStep from '../../../actions/wizard';
import OnboardingWizard from '../../UI/OnboardingWizard';
import DrawerStatusTracker from '../../../core/DrawerStatusTracker';
import { resemblesAddress } from '../../../util/address';

import createAsyncMiddleware from 'json-rpc-engine/src/createAsyncMiddleware';
import { ethErrors } from 'eth-json-rpc-errors';

import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';

const { HOMEPAGE_URL, USER_AGENT, NOTIFICATION_NAMES } = AppConstants;
const HOMEPAGE_HOST = 'home.metamask.io';
const MM_MIXPANEL_TOKEN = process.env.MM_MIXPANEL_TOKEN;

const ANIMATION_TIMING = 300;

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
		marginTop: Device.isAndroid() ? 0 : -5
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
		paddingTop: Device.isAndroid() ? 10 : Device.isIphoneX() ? 50 : 27,
		paddingHorizontal: 10,
		backgroundColor: colors.white,
		height: Device.isAndroid() ? 59 : Device.isIphoneX() ? 87 : 65
	},
	urlModal: {
		justifyContent: 'flex-start',
		margin: 0
	},
	urlInput: {
		...fontStyles.normal,
		backgroundColor: Device.isAndroid() ? colors.white : colors.grey000,
		borderRadius: 30,
		fontSize: Device.isAndroid() ? 16 : 14,
		padding: 8,
		paddingLeft: 15,
		textAlign: 'left',
		flex: 1,
		height: Device.isAndroid() ? 40 : 30
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
			url: props.initialUrl || HOMEPAGE_URL,
			contentHeight: 0,
			forwardEnabled: false,
			forceReload: false,
			suggestedAssetMeta: undefined,
			watchAsset: false,
			activated: props.id === props.activeTab,
			lastError: null,
			showApprovalDialogHostname: undefined,
			showOptions: false,
			lastUrlBeforeHome: null,
			newPageData: {}
		};
	}
	backgroundBridges = [];
	webview = React.createRef();
	inputRef = React.createRef();
	sessionENSNames = {};
	ensIgnoreList = [];
	snapshotTimer = null;
	goingBack = false;
	wizardScrollAdjusted = false;
	isReloading = false;
	approvalRequest;
	analyticsDistinctId;

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

	initializeBackgroundBridge = (url, isMainFrame) => {
		const newBridge = new BackgroundBridge({
			webview: this.webview,
			url,
			getRpcMethodMiddleware: this.getRpcMethodMiddleware.bind(this),
			isMainFrame
		});
		this.backgroundBridges.push(newBridge);
	};

	notifyConnection = (payload, hostname, restricted = true) => {
		const { privacyMode, approvedHosts } = this.props;

		// TODO:permissions move permissioning logic elsewhere
		this.backgroundBridges.forEach(bridge => {
			if (bridge.hostname === hostname && (!restricted || !privacyMode || approvedHosts[bridge.hostname])) {
				bridge.sendNotification(payload);
			}
		});
	};

	notifyAllConnections = (payload, restricted = true) => {
		const { privacyMode, approvedHosts } = this.props;
		const { fullHostname } = this.state;

		// TODO:permissions move permissioning logic elsewhere
		this.backgroundBridges.forEach(bridge => {
			if (bridge.hostname === fullHostname && (!privacyMode || !restricted || approvedHosts[bridge.hostname])) {
				bridge.sendNotification(payload);
			}
		});
	};

	getRpcMethodMiddleware = ({ hostname }) =>
		// all user facing RPC calls not implemented by the provider
		createAsyncMiddleware(async (req, res, next) => {
			const getAccounts = async () => {
				const { approvedHosts, privacyMode, selectedAddress } = this.props;
				const isEnabled = !privacyMode || approvedHosts[hostname];

				return isEnabled ? [selectedAddress.toLowerCase()] : [];
			};

			const rpcMethods = {
				eth_requestAccounts: async () => {
					const { params } = req;
					const { approvedHosts, privacyMode, selectedAddress } = this.props;

					if (!privacyMode || ((!params || !params.force) && approvedHosts[hostname])) {
						res.result = [selectedAddress];
					} else {
						if (!this.state.showApprovalDialog) {
							setTimeout(async () => {
								if (!this.state.showApprovalDialog) {
									await this.getPageMeta();
									this.setState({
										showApprovalDialog: true,
										showApprovalDialogHostname: hostname
									});
								}
							}, 1000); // TODO: how long does this actually have to be?
						}

						const approved = await new Promise((resolve, reject) => {
							this.approvalRequest = { resolve, reject };
						});

						if (approved) {
							res.result = [selectedAddress.toLowerCase()];
						} else {
							throw ethErrors.provider.userRejectedRequest('User denied account authorization.');
						}
					}
				},

				eth_accounts: async () => {
					res.result = await getAccounts();
				},

				eth_coinbase: async () => {
					const accounts = await getAccounts();
					res.result = accounts.length > 0 ? accounts[0] : null;
				},

				eth_sign: async () => {
					const { MessageManager } = Engine.context;
					const pageMeta = await this.getPageMeta();
					const rawSig = await MessageManager.addUnapprovedMessageAsync({
						data: req.params[1],
						from: req.params[0],
						...pageMeta
					});

					res.result = rawSig;
				},

				personal_sign: async () => {
					const { PersonalMessageManager } = Engine.context;
					const firstParam = req.params[0];
					const secondParam = req.params[1];
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

					res.result = rawSig;
				},

				eth_signTypedData: async () => {
					const { TypedMessageManager } = Engine.context;
					const pageMeta = await this.getPageMeta();
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: req.params[0],
							from: req.params[1],
							...pageMeta
						},
						'V1'
					);

					res.result = rawSig;
				},

				eth_signTypedData_v3: async () => {
					const { TypedMessageManager } = Engine.context;
					const data = JSON.parse(req.params[1]);
					const chainId = data.domain.chainId;
					const activeChainId =
						this.props.networkType === 'rpc'
							? this.props.network
							: Networks[this.props.networkType].networkId;

					// eslint-disable-next-line
					if (chainId && chainId != activeChainId) {
						throw ethErrors.rpc.invalidRequest(
							`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`
						);
					}

					const pageMeta = await this.getPageMeta();
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: req.params[1],
							from: req.params[0],
							...pageMeta
						},
						'V3'
					);

					res.result = rawSig;
				},

				eth_signTypedData_v4: async () => {
					const { TypedMessageManager } = Engine.context;
					const data = JSON.parse(req.params[1]);
					const chainId = data.domain.chainId;
					const activeChainId =
						this.props.networkType === 'rpc'
							? this.props.network
							: Networks[this.props.networkType].networkId;

					// eslint-disable-next-line eqeqeq
					if (chainId && chainId != activeChainId) {
						throw ethErrors.rpc.invalidRequest(
							`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`
						);
					}

					const pageMeta = await this.getPageMeta();
					const rawSig = await TypedMessageManager.addUnapprovedMessageAsync(
						{
							data: req.params[1],
							from: req.params[0],
							...pageMeta
						},
						'V4'
					);

					res.result = rawSig;
				},

				web3_clientVersion: async () => {
					res.result = `MetaMask/${this.props.app_version}/Beta/Mobile`;
				},

				wallet_scanQRCode: () =>
					new Promise((resolve, reject) => {
						this.props.navigation.navigate('QRScanner', {
							onScanSuccess: data => {
								const regex = new RegExp(req.params[0]);
								if (regex && !regex.exec(data)) {
									reject({ message: 'NO_REGEX_MATCH', data });
								} else if (!regex && !/^(0x){1}[0-9a-fA-F]{40}$/i.exec(data.target_address)) {
									reject({ message: 'INVALID_ETHEREUM_ADDRESS', data: data.target_address });
								}
								let result = data;
								if (data.target_address) {
									result = data.target_address;
								} else if (data.scheme) {
									result = JSON.stringify(data);
								}
								res.result = result;
								resolve();
							},
							onScanError: e => {
								throw ethErrors.rpc.internal(e.toString());
							}
						});
					}),

				wallet_watchAsset: async () => {
					const {
						options: { address, decimals, image, symbol },
						type
					} = req;
					const { AssetsController } = Engine.context;
					const suggestionResult = await AssetsController.watchAsset(
						{ address, symbol, decimals, image },
						type
					);

					res.result = suggestionResult.result;
				},

				metamask_removeFavorite: async () => {
					if (!this.isHomepage()) {
						throw ethErrors.provider.unauthorized('Forbidden.');
					}
					Alert.alert(strings('browser.remove_bookmark_title'), strings('browser.remove_bookmark_msg'), [
						{
							text: strings('browser.cancel'),
							onPress: () => {
								res.result = {
									favorites: this.props.bookmarks
								};
							},
							style: 'cancel'
						},
						{
							text: strings('browser.yes'),
							onPress: () => {
								const bookmark = { url: req.params[0] };
								this.props.removeBookmark(bookmark);
								// remove bookmark from homepage
								this.refreshHomeScripts();
								res.result = {
									favorites: this.props.bookmarks
								};
							}
						}
					]);
				},

				metamask_showTutorial: async () => {
					this.wizardScrollAdjusted = false;
					this.props.setOnboardingWizardStep(1);
					this.props.navigation.navigate('WalletView');

					res.result = true;
				},

				metamask_showAutocomplete: async () => {
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

					res.result = true;
				}
			};

			if (!rpcMethods[req.method]) {
				return next();
			}
			await rpcMethods[req.method]();
		});

	init = async () => {
		const entryScriptWeb3 = await EntryScriptWeb3.get();

		const analyticsEnabled = Analytics.getEnabled();
		const disctinctId = await Analytics.getDistinctId();

		const homepageScripts = `
      window.__mmFavorites = ${JSON.stringify(this.props.bookmarks)};
      window.__mmSearchEngine = "${this.props.searchEngine}";
      window.__mmMetametrics = ${analyticsEnabled};
	  window.__mmDistinctId = "${disctinctId}";
      window.__mmMixpanelToken = "${MM_MIXPANEL_TOKEN}";
	  `;

		await this.setState({ entryScriptWeb3: entryScriptWeb3 + SPA_urlChangeListener, homepageScripts });
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

		if (Device.isAndroid()) {
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
			Logger.error(error, 'Error from Branch');
			return;
		}
		// QA THIS
		if (params.spotlight_identifier) {
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

	refreshHomeScripts = async () => {
		const analyticsEnabled = Analytics.getEnabled();
		const disctinctId = await Analytics.getDistinctId();
		const homepageScripts = `
      window.__mmFavorites = ${JSON.stringify(this.props.bookmarks)};
      window.__mmSearchEngine="${this.props.searchEngine}";
	  window.__mmMetametrics = ${analyticsEnabled};
	  window.__mmDistinctId = "${disctinctId}";
	  window.__mmMixpanelToken = "${MM_MIXPANEL_TOKEN}";
	  window.postMessage('updateFavorites', '*');
	`;
		this.setState({ homepageScripts }, () => {
			const { current } = this.webview;
			if (current) {
				current.injectJavaScript(homepageScripts);
			}
		});
	};

	setTabActive() {
		this.setState({ activated: true });
	}

	componentDidUpdate(prevProps) {
		const {
			approvedHosts: prevApprovedHosts,
			navigation: prevNavigation,
			selectedAddress: prevSelectedAddress
		} = prevProps;
		const { approvedHosts, navigation, selectedAddress } = this.props;

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

		const numApprovedHosts = Object.keys(approvedHosts).length;
		const prevNumApprovedHosts = Object.keys(prevApprovedHosts).length;

		// this will happen if the approved hosts were cleared
		if (numApprovedHosts === 0 && prevNumApprovedHosts > 0) {
			this.notifyAllConnections(
				{
					method: NOTIFICATION_NAMES.accountsChanged,
					result: []
				},
				false
			); // notification should be sent regardless of approval status
		}

		if (numApprovedHosts > 0 && selectedAddress !== prevSelectedAddress) {
			this.notifyAllConnections({
				method: NOTIFICATION_NAMES.accountsChanged,
				result: [selectedAddress]
			});
		}
	}

	componentWillUnmount() {
		this.mounted = false;
		this.backgroundBridges.forEach(bridge => bridge.onDisconnect());
		// Remove all Engine listeners
		Engine.context.AssetsController.hub.removeAllListeners();
		Engine.context.TransactionController.hub.removeListener('networkChange', this.reload);
		this.keyboardDidHideListener && this.keyboardDidHideListener.remove();
		if (Device.isAndroid()) {
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
		const isEnsUrl = this.isENSUrl(sanitizedURL);
		if (isEnsUrl) {
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
				currentEnsName: isEnsUrl && hostname,
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
			} else if (type === 'ipns-ns') {
				gatewayUrl = `${AppConstants.IPNS_DEFAULT_GATEWAY_URL}${hostname}${pathname || '/'}${query || ''}`;
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
			Logger.error(err, 'Failed to resolve ENS name');
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
		if (!this.canGoBack()) return;

		this.toggleOptionsIfNeeded();
		this.goingBack = true;
		setTimeout(() => {
			this.goingBack = false;
		}, 500);

		const { current } = this.webview;
		const { lastUrlBeforeHome } = this.state;

		if (this.isHomepage() && lastUrlBeforeHome) {
			this.go(lastUrlBeforeHome);
		} else {
			current && current.goBack();
		}

		setTimeout(() => {
			this.props.navigation.setParams({
				...this.props.navigation.state.params,
				url: this.state.inputValue
			});
		}, 100);
		// Need to wait for nav_change & onPageChanged
		setTimeout(() => {
			this.setState({
				forwardEnabled: true,
				currentPageTitle: null
			});
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
			this.setState({ lastUrlBeforeHome });
		}, 1000);
	};

	goForward = async () => {
		const { current } = this.webview;
		const { lastUrlBeforeHome } = this.state;
		if (lastUrlBeforeHome) {
			this.go(lastUrlBeforeHome);
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
			}, ANIMATION_TIMING);
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
		this.checkForPageMeta(() =>
			this.props.navigation.push('AddBookmarkView', {
				title: this.state.currentPageTitle || '',
				url: this.state.inputValue,
				onAddBookmark: async ({ name, url }) => {
					this.props.addBookmark({ name, url });
					if (Device.isIos()) {
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
							Logger.error(e, 'Error adding to spotlight');
						}
					}
					const analyticsEnabled = Analytics.getEnabled();
					const disctinctId = await Analytics.getDistinctId();
					const homepageScripts = `
            window.__mmFavorites = ${JSON.stringify(this.props.bookmarks)};
            window.__mmSearchEngine="${this.props.searchEngine}";
			window.__mmMetametrics = ${analyticsEnabled};
			window.__mmDistinctId = "${disctinctId}";
			window.__mmMixpanelToken = "${MM_MIXPANEL_TOKEN}";
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
		}, ANIMATION_TIMING);
	};

	onNewTabPress = () => {
		this.openNewTab();
	};
	openNewTab = url => {
		this.toggleOptionsIfNeeded();
		setTimeout(() => {
			this.props.newTab(url);
		}, ANIMATION_TIMING);
	};

	openInBrowser = () => {
		this.toggleOptionsIfNeeded();
		Linking.openURL(this.state.inputValue).catch(error =>
			Logger.log('Error while trying to open external link: ${url}', error)
		);
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_OPEN_IN_BROWSER);
	};

	dismissTextSelectionIfNeeded() {
		if (this.isTabActive() && Device.isAndroid()) {
			const { current } = this.webview;
			if (current) {
				setTimeout(() => {
					current.injectJavaScript(JS_DESELECT_TEXT);
				}, 50);
			}
		}
	}

	toggleOptionsIfNeeded() {
		if (this.state.showOptions) {
			this.toggleOptions();
		}
	}

	toggleOptions = () => {
		this.dismissTextSelectionIfNeeded();

		this.setState({ showOptions: !this.state.showOptions }, () => {
			if (this.state.showOptions) {
				InteractionManager.runAfterInteractions(() => {
					Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_BROWSER_OPTIONS);
				});
			}
		});
	};

	onMessage = ({ nativeEvent: { data } }) => {
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;
			if (!data || (!data.type && !data.name)) {
				return;
			}
			if (data.name) {
				this.backgroundBridges.forEach(bridge => {
					if (bridge.isMainFrame) {
						const { origin } = data && data.origin && new URL(data.origin);
						bridge.url === origin && bridge.onMessage(data);
					} else {
						bridge.url === data.origin && bridge.onMessage(data);
					}
				});
				return;
			}

			switch (data.type) {
				case 'FRAME_READY': {
					const { url } = data.payload;
					this.onFrameLoadStarted(url);
					break;
				}

				case 'NAV_CHANGE': {
					// This event is not necessary since it is handled by the onLoadEnd now
					break;
				}

				case 'GET_TITLE_FOR_BOOKMARK':
					if (data.payload.title) {
						this.setState({
							currentPageTitle: data.payload.title,
							currentPageUrl: data.payload.url,
							currentPageIcon: data.payload.icon
						});
					}
					break;

				case 'GET_WEBVIEW_URL':
					this.webviewUrlPostMessagePromiseResolve(data.payload.url);
			}
		} catch (e) {
			Logger.error(e, `Browser::onMessage on ${this.state.inputValue}`);
		}
	};

	onShouldStartLoadWithRequest = ({ url, navigationType }) => {
		if (Device.isIos()) {
			return true;
		}
		if (this.isENSUrl(url) && navigationType === 'other') {
			this.go(url.replace('http://', 'https://'));
			return false;
		}
		return true;
	};

	onPageChange = url => {
		if (this.isHomepage(url)) {
			this.refreshHomeScripts();
		}
		if (url === this.state.url && !this.isHomepage(url)) return;
		const { ipfsGateway } = this.props;
		const data = {};
		const urlObj = new URL(url);
		if (urlObj.protocol.indexOf('http') === -1) {
			return;
		}

		if (this.resolvingENSUrl) {
			return;
		}

		if (!this.isHomepage(url)) {
			this.setState({ lastUrlBeforeHome: null });
		}

		if (!this.state.showPhishingModal && !this.isAllowedUrl(urlObj.hostname)) {
			this.handleNotAllowedUrl(url);
		}

		if (this.isENSUrl(url)) {
			this.go(url.replace('http://', 'https://'));
			const { current } = this.webview;
			current && current.stopLoading();
			return;
		} else if (url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) === -1) {
			if (this.state.contentType === 'ipfs-ns') {
				data.inputValue = url.replace(
					`${ipfsGateway}${this.state.contentId}/`,
					`https://${this.state.currentEnsName}/`
				);
			} else if (this.state.contentType === 'ipns-ns') {
				data.inputValue = url.replace(
					`${ipfsGateway}${this.state.currentEnsName}/`,
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
		this.setState({ newPageData: data });
	};

	formatHostname(hostname) {
		return hostname.toLowerCase().replace(/^www./, '');
	}

	onURLChange = inputValue => {
		this.setState({ autocompleteInputValue: inputValue });
	};

	onLoadProgress = ({ nativeEvent: { progress, ...args } }) => {
		this.setState({ progress });
	};

	webviewUrlPostMessagePromiseResolve = null;

	onLoadEnd = ({ nativeEvent }) => {
		if (nativeEvent.loading) return;

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
		if (this.isHomepage(nativeEvent.url) && current) {
			const js = this.state.homepageScripts;
			current.injectJavaScript(js);
		}

		// Onloadstart does not fire when a website url has changes, e.g. example.com/ex#user1 to example.com/ex#user2. So this is needed for those cases.
		const { url, title } = nativeEvent;
		const urlObj = new URL(url);
		if (urlObj.hostname === this.state.fullHostname && nativeEvent.url !== this.state.inputValue) {
			this.setState({
				url,
				inputValue: url,
				autocompleteInputValue: url,
				currentPageTitle: title,
				forwardEnabled: false
			});
			this.setState({ lastUrlBeforeHome: null });
			this.props.navigation.setParams({ url: nativeEvent.url, silent: true, showUrlModal: false });
			this.updateTabInfo(nativeEvent.url);
		} else {
			current && current.injectJavaScript(JS_WEBVIEW_URL);

			const promiseResolver = resolve => {
				this.webviewUrlPostMessagePromiseResolve = resolve;
			};
			const promise = current ? new Promise(promiseResolver) : Promise.resolve(url);

			promise.then(webviewUrl => {
				const fullHostname = urlObj.hostname;
				if (webviewUrl === url) {
					const { inputValue, hostname } = this.state.newPageData;
					if (
						fullHostname !== this.state.fullHostname ||
						url.search(`${AppConstants.IPFS_OVERRIDE_PARAM}=false`) !== -1
					) {
						if (this.isTabActive()) {
							this.props.navigation.setParams({
								url,
								silent: true,
								showUrlModal: false
							});
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
				}
			});
		}
	};

	onError = ({ nativeEvent: errorInfo }) => {
		Logger.log(errorInfo);
		this.props.navigation.setParams({
			error: true
		});
		this.setState({ lastError: errorInfo });
	};

	renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	renderOptions = () => {
		const { showOptions } = this.state;
		if (showOptions) {
			return (
				<TouchableWithoutFeedback onPress={this.toggleOptions}>
					<View style={styles.optionsOverlay}>
						<View
							style={[
								styles.optionsWrapper,
								Device.isAndroid() ? styles.optionsWrapperAndroid : styles.optionsWrapperIos
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
				{!this.isBookmark() && (
					<Button onPress={this.addBookmark} style={styles.option}>
						<View style={styles.optionIconWrapper}>
							<Icon name="star" size={16} style={styles.optionIcon} />
						</View>
						<Text style={styles.optionText} numberOfLines={1}>
							{strings('browser.add_to_favorites')}
						</Text>
					</Button>
				)}
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
		const canGoBack = this.canGoBack();
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

	/**
	 * reset autocompleteInputValue to be the url if the input has been left empty
	 */
	resetAutocompleteInputValue = urlParam => {
		const { autocompleteInputValue } = this.state;
		if (autocompleteInputValue === '') {
			this.setState({
				autocompleteInputValue: urlParam
			});
		}
	};

	hideUrlModal = url => {
		const urlParam = typeof url === 'string' && url ? url : this.props.navigation.state.params.url;
		this.props.navigation.setParams({
			...this.props.navigation.state.params,
			url: urlParam,
			showUrlModal: false
		});

		setTimeout(this.resetAutocompleteInputValue, ANIMATION_TIMING, urlParam);

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
			}, ANIMATION_TIMING);
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
				animationInTiming={ANIMATION_TIMING}
				animationOutTiming={ANIMATION_TIMING}
				useNativeDriver
			>
				<View style={styles.urlModalContent} testID={'url-modal'}>
					<TextInput
						keyboardType="web-search"
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

					{Device.isAndroid() ? (
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
		this.approvalRequest && this.approvalRequest.resolve && this.approvalRequest.resolve([selectedAddress]);
	};

	onAccountsReject = () => {
		this.setState({ showApprovalDialog: false, showApprovalDialogHostname: undefined });
		this.approvalRequest &&
			this.approvalRequest.reject &&
			this.approvalRequest.reject(new Error('User rejected account access'));
	};

	renderApprovalModal = () => {
		const {
			showApprovalDialogHostname,
			currentPageTitle,
			currentPageUrl,
			currentPageIcon,
			inputValue,
			currentEnsName
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
				animationInTiming={ANIMATION_TIMING}
				animationOutTiming={ANIMATION_TIMING}
				onSwipeComplete={this.onAccountsReject}
				onBackdropPress={this.onAccountsReject}
				swipeDirection={'down'}
			>
				<AccountApproval
					onCancel={this.onAccountsReject}
					onConfirm={this.onAccountsConfirm}
					currentPageInformation={{ title: currentPageTitle, url, icon: currentPageIcon, currentEnsName }}
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
				animationInTiming={ANIMATION_TIMING}
				animationOutTiming={ANIMATION_TIMING}
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

	onFrameLoadStarted = url => {
		url && this.initializeBackgroundBridge(url, false);
	};

	webviewRefIsReady = () =>
		this.webview &&
		this.webview.current &&
		this.webview.current.webViewRef &&
		this.webview.current.webViewRef.current;

	onLoadStart = async ({ nativeEvent }) => {
		// Handle the scenario when going back
		// from an ENS name
		this.props.navigation.setParams({ error: false });
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

		let i = 0;
		while (!this.webviewRefIsReady() && i < 10) {
			await new Promise(res =>
				setTimeout(() => {
					res();
				}, 500)
			);
			i++;
		}

		if (this.webviewRefIsReady()) {
			// Reset the previous bridges
			this.backgroundBridges.length && this.backgroundBridges.forEach(bridge => bridge.onDisconnect());
			this.backgroundBridges = [];
			const origin = new URL(nativeEvent.url).origin;
			this.initializeBackgroundBridge(origin, true);
		}

		this.onPageChange(nativeEvent.url);
	};

	canGoForward = () => this.state.forwardEnabled;

	canGoBack = () => {
		if (this.isHomepage()) {
			return !!this.state.lastUrlBeforeHome && !this.isHomepage(this.state.lastUrlBeforeHome);
		}

		return true;
	};

	isTabActive = () => {
		const { activeTab, id } = this.props;
		return activeTab === id;
	};

	isBookmark = () => {
		const { bookmarks, navigation } = this.props;
		const currentUrl = navigation.getParam('url', null);
		return bookmarks.some(({ url }) => url === currentUrl);
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

	render() {
		const { entryScriptWeb3, url, forceReload, activated } = this.state;
		const isHidden = !this.isTabActive();

		return (
			<View
				style={[styles.wrapper, isHidden && styles.hide]}
				{...(Device.isAndroid() ? { collapsable: false } : {})}
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
							ref={this.webview}
							source={{ uri: url }}
							style={styles.webview}
							userAgent={USER_AGENT}
							sendCookies
							javascriptEnabled
							allowsInlineMediaPlayback
							useWebkit
							onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
							testID={'browser-webview'}
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
	wizardStep: state.wizard.step
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
