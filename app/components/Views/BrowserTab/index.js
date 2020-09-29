import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
	Text,
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
import { withNavigation } from 'react-navigation';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import BrowserBottomBar from '../../UI/BrowserBottomBar';
import PropTypes from 'prop-types';
import Share from 'react-native-share';
import { connect } from 'react-redux';
import BackgroundBridge from '../../../core/BackgroundBridge';
import Engine from '../../../core/Engine';
import PhishingModal from '../../UI/PhishingModal';
import WebviewProgressBar from '../../UI/WebviewProgressBar';
import { colors, baseStyles, fontStyles } from '../../../styles/common';
import Networks from '../../../util/networks';
import Logger from '../../../util/Logger';
import onUrlSubmit, { getHost, getUrlObj } from '../../../util/browser';
import { SPA_urlChangeListener, JS_DESELECT_TEXT, JS_WEBVIEW_URL } from '../../../util/browserScripts';
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
import { getVersion } from 'react-native-device-info';

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

let wizardScrollAdjusted = false;

const sessionENSNames = {};
const ensIgnoreList = [];
let approvedHosts = {};
let appVersion = '';

export const BrowserTab = props => {
	const [backEnabled, setBackEnabled] = useState(false);
	const [forwardEnabled, setForwardEnabled] = useState(false);
	const [progress, setProgress] = useState(0);
	const [initialUrl, setInitialUrl] = useState('');
	const [firstUrlLoaded, setFirstUrlLoaded] = useState(false);
	const [autocompleteValue, setAutocompleteValue] = useState('');
	const [error, setError] = useState(null);
	const [showUrlModal, setShowUrlModal] = useState(false);
	const [showOptions, setShowOptions] = useState(false);
	const [entryScriptWeb3, setEntryScriptWeb3] = useState(null);
	const [showApprovalDialog, setShowApprovalDialog] = useState(false);
	const [showApprovalDialogHostname, setShowApprovalDialogHostname] = useState(undefined);
	const [showPhishingModal, setShowPhishingModal] = useState(false);
	const [blockedUrl, setBlockedUrl] = useState(undefined);
	const [watchAsset, setWatchAsset] = useState(false);
	const [suggestedAssetMeta, setSuggestedAssetMeta] = useState(undefined);

	const webviewRef = useRef(null);
	const inputRef = useRef(null);

	const url = useRef('');
	const title = useRef('');
	const icon = useRef(null);
	const webviewUrlPostMessagePromiseResolve = useRef(null);
	const backgroundBridges = useRef([]);
	const approvalRequest = useRef(null);
	const fromHomepage = useRef(false);

	/**
	 * Gets the url to be displayed to the user
	 * For example, if it's ens then show [site].eth instead of ipfs url
	 */
	const getMaskedUrl = url => {
		if (!url) return url;
		let replace = null;
		if (url.startsWith(AppConstants.IPFS_DEFAULT_GATEWAY_URL)) {
			replace = key => `${AppConstants.IPFS_DEFAULT_GATEWAY_URL}${sessionENSNames[key].hash}/`;
		} else if (url.startsWith(AppConstants.IPNS_DEFAULT_GATEWAY_URL)) {
			replace = key => `${AppConstants.IPNS_DEFAULT_GATEWAY_URL}${sessionENSNames[key].hostname}/`;
		} else if (url.startsWith(AppConstants.SWARM_DEFAULT_GATEWAY_URL)) {
			replace = key => `${AppConstants.SWARM_GATEWAY_URL}${sessionENSNames[key].hash}/`;
		}

		if (replace) {
			const key = Object.keys(sessionENSNames).find(ens => url.startsWith(ens));
			if (key) {
				url = url.replace(replace(key), `https://${sessionENSNames[key].hostname}/`);
			}
		}

		return url;
	};

	/**
	 * Shows or hides the url input modal.
	 * When opened it sets the current website url on the input.
	 */
	const toggleUrlModal = useCallback(
		({ urlInput = null } = {}) => {
			const goingToShow = !showUrlModal;
			const urlToShow = getMaskedUrl(urlInput || url.current);

			if (goingToShow && urlToShow) setAutocompleteValue(urlToShow);

			setShowUrlModal(goingToShow);
		},
		[showUrlModal]
	);

	/**
	 * Checks if it is a ENS website
	 */
	const isENSUrl = url => {
		const { hostname } = new URL(url);
		const tld = hostname.split('.').pop();
		if (AppConstants.supportedTLDs.indexOf(tld.toLowerCase()) !== -1) {
			// Make sure it's not in the ignore list
			if (ensIgnoreList.indexOf(hostname) === -1) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Checks if a given url or the current url is the homepage
	 */
	const isHomepage = useCallback((checkUrl = null) => {
		const currentPage = checkUrl || url.current;
		const { host: currentHost, pathname: currentPathname } = getUrlObj(currentPage);
		return currentHost === HOMEPAGE_HOST && currentPathname === '/';
	}, []);

	/**
	 * When user clicks on approve to connect with a dapp
	 */
	const onAccountsConfirm = () => {
		const { approveHost, selectedAddress } = props;
		const fullHostname = new URL(url.current).hostname;
		setShowApprovalDialog(false);
		setShowApprovalDialogHostname(undefined);
		approveHost(fullHostname);
		approvedHosts = { ...approvedHosts, [fullHostname]: true };
		approvalRequest.current &&
			approvalRequest.current.resolve &&
			approvalRequest.current.resolve([selectedAddress]);
	};

	/**
	 * When user clicks on reject to connect with a dapp
	 */
	const onAccountsReject = () => {
		setShowApprovalDialog(false);
		setShowApprovalDialogHostname(undefined);
		approvalRequest.current &&
			approvalRequest.current.reject &&
			approvalRequest.current.reject(new Error('User rejected account access'));
	};

	const notifyAllConnections = useCallback(
		(payload, restricted = true) => {
			const fullHostname = new URL(url.current).hostname;

			// TODO:permissions move permissioning logic elsewhere
			backgroundBridges.current.forEach(bridge => {
				if (
					bridge.hostname === fullHostname &&
					(!props.privacyMode || !restricted || approvedHosts[bridge.hostname])
				) {
					bridge.sendNotification(payload);
				}
			});
		},
		[props.privacyMode]
	);

	/**
	 * Manage hosts that were approved to connect with the user accounts
	 */
	useEffect(() => {
		const { approvedHosts: approvedHostsProps, selectedAddress } = props;

		approvedHosts = approvedHostsProps;

		const numApprovedHosts = Object.keys(approvedHosts).length;

		// this will happen if the approved hosts were cleared
		if (numApprovedHosts === 0) {
			notifyAllConnections(
				{
					method: NOTIFICATION_NAMES.accountsChanged,
					result: []
				},
				false
			); // notification should be sent regardless of approval status
		}

		if (numApprovedHosts > 0) {
			notifyAllConnections({
				method: NOTIFICATION_NAMES.accountsChanged,
				result: [selectedAddress]
			});
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [notifyAllConnections, props.approvedHosts, props.selectedAddress]);

	/**
	 * Handle RPC methods called by dapps
	 */
	const getRpcMethodMiddleware = ({ hostname }) =>
		// all user facing RPC calls not implemented by the provider
		createAsyncMiddleware(async (req, res, next) => {
			const getAccounts = async () => {
				const { privacyMode, selectedAddress } = props;
				const isEnabled = !privacyMode || approvedHosts[hostname];

				return isEnabled ? [selectedAddress.toLowerCase()] : [];
			};

			const rpcMethods = {
				eth_requestAccounts: async () => {
					const { params } = req;
					const { privacyMode, selectedAddress } = props;

					if (!privacyMode || ((!params || !params.force) && approvedHosts[hostname])) {
						res.result = [selectedAddress];
					} else {
						if (showApprovalDialog) return;
						setShowApprovalDialog(true);
						setShowApprovalDialogHostname(hostname);

						const approved = await new Promise((resolve, reject) => {
							approvalRequest.current = { resolve, reject };
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
					const pageMeta = {
						meta: {
							url: url.current,
							title: title.current,
							icon: icon.current
						}
					};
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

					const pageMeta = {
						meta: {
							url: url.current,
							title: title.current,
							icon: icon.current
						}
					};
					const rawSig = await PersonalMessageManager.addUnapprovedMessageAsync({
						...params,
						...pageMeta
					});

					res.result = rawSig;
				},

				eth_signTypedData: async () => {
					const { TypedMessageManager } = Engine.context;
					const pageMeta = {
						meta: {
							url: url.current,
							title: title.current,
							icon: icon.current
						}
					};
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
						props.networkType === 'rpc' ? props.network : Networks[props.networkType].networkId;

					// eslint-disable-next-line
					if (chainId && chainId != activeChainId) {
						throw ethErrors.rpc.invalidRequest(
							`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`
						);
					}

					const pageMeta = {
						meta: {
							url: url.current,
							title: title.current,
							icon: icon.current
						}
					};

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
						props.networkType === 'rpc' ? props.network : Networks[props.networkType].networkId;

					// eslint-disable-next-line eqeqeq
					if (chainId && chainId != activeChainId) {
						throw ethErrors.rpc.invalidRequest(
							`Provided chainId (${chainId}) must match the active chainId (${activeChainId})`
						);
					}

					const pageMeta = {
						meta: {
							url: url.current,
							title: title.current,
							icon: icon.current
						}
					};
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
					let version = appVersion;
					if (!version) {
						appVersion = await getVersion();
						version = appVersion;
					}
					res.result = `MetaMask/${version}/Beta/Mobile`;
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
						params: {
							options: { address, decimals, image, symbol },
							type
						}
					} = req;
					const { AssetsController } = Engine.context;
					const suggestionResult = await AssetsController.watchAsset(
						{ address, symbol, decimals, image },
						type
					);

					res.result = suggestionResult.result;
				},

				metamask_removeFavorite: async () => {
					if (!isHomepage()) {
						throw ethErrors.provider.unauthorized('Forbidden.');
					}
					Alert.alert(strings('browser.remove_bookmark_title'), strings('browser.remove_bookmark_msg'), [
						{
							text: strings('browser.cancel'),
							onPress: () => {
								res.result = {
									favorites: props.bookmarks
								};
							},
							style: 'cancel'
						},
						{
							text: strings('browser.yes'),
							onPress: () => {
								const bookmark = { url: req.params[0] };
								props.removeBookmark(bookmark);
								res.result = {
									favorites: props.bookmarks
								};
							}
						}
					]);
				},

				metamask_showTutorial: async () => {
					wizardScrollAdjusted = false;
					props.setOnboardingWizardStep(1);
					props.navigation.navigate('WalletView');

					res.result = true;
				},

				metamask_showAutocomplete: async () => {
					fromHomepage.current = true;
					setAutocompleteValue('');
					setShowUrlModal(true);

					setTimeout(() => {
						fromHomepage.current = false;
					}, 1500);

					res.result = true;
				}
			};

			if (!rpcMethods[req.method]) {
				return next();
			}
			await rpcMethods[req.method]();
		});

	const initializeBackgroundBridge = (url, isMainFrame) => {
		const newBridge = new BackgroundBridge({
			webview: webviewRef,
			url,
			getRpcMethodMiddleware,
			isMainFrame
		});
		backgroundBridges.current.push(newBridge);
	};

	const onFrameLoadStarted = url => {
		url && initializeBackgroundBridge(url, false);
	};

	/**
	 * Is the current tab the active tab
	 */
	const isTabActive = useCallback(() => props.activeTab === props.id, [props.activeTab, props.id]);

	/**
	 * Dismiss the text selection on the current website
	 */
	const dismissTextSelectionIfNeeded = useCallback(() => {
		if (isTabActive() && Device.isAndroid()) {
			const { current } = webviewRef;
			if (current) {
				setTimeout(() => {
					current.injectJavaScript(JS_DESELECT_TEXT);
				}, 50);
			}
		}
	}, [isTabActive]);

	/**
	 * Toggle the options menu
	 */
	const toggleOptions = useCallback(() => {
		dismissTextSelectionIfNeeded();
		setShowOptions(!showOptions);
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_BROWSER_OPTIONS);
		});
	}, [dismissTextSelectionIfNeeded, showOptions]);

	/**
	 * Show the options menu
	 */
	const toggleOptionsIfNeeded = useCallback(() => {
		if (showOptions) {
			toggleOptions();
		}
	}, [showOptions, toggleOptions]);

	/**
	 * Go back to previous website in history
	 */
	const goBack = useCallback(() => {
		if (!backEnabled) return;

		toggleOptionsIfNeeded();
		const { current } = webviewRef;
		current && current.goBack();
	}, [backEnabled, toggleOptionsIfNeeded]);

	/**
	 * Go forward to the next website in history
	 */
	const goForward = async () => {
		if (!forwardEnabled) return;

		toggleOptionsIfNeeded();
		const { current } = webviewRef;
		current && current.goForward && current.goForward();
	};

	/**
	 * Check if a hostname is allowed
	 */
	const isAllowedUrl = useCallback(
		hostname => {
			const { PhishingController } = Engine.context;
			return (props.whitelist && props.whitelist.includes(hostname)) || !PhishingController.test(hostname);
		},
		[props.whitelist]
	);

	const isBookmark = () => {
		const { bookmarks } = props;
		return bookmarks.some(({ url: bookmark }) => bookmark === url.current);
	};

	/**
	 * Inject home page scripts to get the favourites and set analytics key
	 */
	const injectHomePageScripts = async () => {
		const { current } = webviewRef;
		if (!current) return;
		const analyticsEnabled = Analytics.getEnabled();
		const disctinctId = await Analytics.getDistinctId();

		const homepageScripts = `
      window.__mmFavorites = ${JSON.stringify(props.bookmarks)};
      window.__mmSearchEngine = "${props.searchEngine}";
      window.__mmMetametrics = ${analyticsEnabled};
	  window.__mmDistinctId = "${disctinctId}";
      window.__mmMixpanelToken = "${MM_MIXPANEL_TOKEN}";
	  `;

		current.injectJavaScript(homepageScripts);
	};

	/**
	 * Show a phishing modal when a url is not allowed
	 */
	const handleNotAllowedUrl = urlToGo => {
		setBlockedUrl(urlToGo);
		setTimeout(() => setShowPhishingModal(true), 1000);
	};

	/**
	 * Get IPFS info from a ens url
	 */
	const handleIpfsContent = useCallback(
		async (fullUrl, { hostname, pathname, query }) => {
			const { provider } = Engine.context.NetworkController;
			let gatewayUrl;
			try {
				const { type, hash } = await resolveEnsToIpfsContentId({
					provider,
					name: hostname
				});
				if (type === 'ipfs-ns') {
					gatewayUrl = `${props.ipfsGateway}${hash}${pathname || '/'}${query || ''}`;
					const response = await fetch(gatewayUrl);
					const statusCode = response.status;
					if (statusCode >= 400) {
						Logger.log('Status code ', statusCode, gatewayUrl);
						//urlNotFound(gatewayUrl);
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
					ensIgnoreList.push(hostname);
					return { url: fullUrl, reload: true };
				}
				Logger.error(err, 'Failed to resolve ENS name');
				Alert.alert(strings('browser.error'), strings('browser.failed_to_resolve_ens_name'));
				goBack();
			}
		},
		[goBack, props.ipfsGateway]
	);

	/**
	 * Go to a url
	 */
	const go = useCallback(
		async (url, initialCall) => {
			const hasProtocol = url.match(/^[a-z]*:\/\//) || isHomepage(url);
			const sanitizedURL = hasProtocol ? url : `${props.defaultProtocol}${url}`;
			const { hostname, query, pathname } = new URL(sanitizedURL);

			let urlToGo = sanitizedURL;
			const isEnsUrl = isENSUrl(url);
			const { current } = webviewRef;
			if (isEnsUrl) {
				current && current.stopLoading();
				const { url: ensUrl, type, hash, reload } = await handleIpfsContent(url, { hostname, query, pathname });
				if (reload) return go(ensUrl);
				urlToGo = ensUrl;
				sessionENSNames[urlToGo] = { hostname, hash, type };
			}

			if (isAllowedUrl(hostname)) {
				if (initialCall) {
					setInitialUrl(urlToGo);
					setFirstUrlLoaded(true);
				} else {
					current && current.injectJavaScript(`(function(){window.location.href = '${urlToGo}' })()`);
				}

				setProgress(0);
				return sanitizedURL;
			}
			handleNotAllowedUrl(urlToGo);
			return null;
		},
		[handleIpfsContent, isAllowedUrl, isHomepage, props.defaultProtocol]
	);

	/**
	 * Open a new tab
	 */
	const openNewTab = useCallback(
		url => {
			toggleOptionsIfNeeded();
			dismissTextSelectionIfNeeded();
			props.newTab(url);
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[dismissTextSelectionIfNeeded, toggleOptionsIfNeeded]
	);

	/**
	 * Handle Branch deeplinking
	 */
	const handleBranchDeeplink = useCallback(
		deeplink_url => {
			Logger.log('Branch Deeplink detected!', deeplink_url);
			DeeplinkManager.parse(deeplink_url, url => {
				openNewTab(url);
			});
		},
		[openNewTab]
	);

	/**
	 * Handle deeplinking
	 */
	const handleDeeplinks = useCallback(
		async ({ error, params }) => {
			if (!isTabActive()) return false;
			if (error) {
				Logger.error(error, 'Error from Branch');
				return;
			}
			// QA THIS
			if (params.spotlight_identifier) {
				setTimeout(() => {
					props.navigation.setParams({
						url: params.spotlight_identifier,
						silent: false
					});
					setShowUrlModal(false);
				}, 1000);
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[isTabActive]
	);

	/**
	 * Hide url input modal
	 */
	const hideUrlModal = useCallback(() => {
		setShowUrlModal(false);

		if (isHomepage()) {
			const { current } = webviewRef;
			const blur = `document.getElementsByClassName('autocomplete-input')[0].blur();`;
			current && current.injectJavaScript(blur);
		}
	}, [isHomepage]);

	/**
	 * Handle keyboard hide
	 */
	const keyboardDidHide = useCallback(() => {
		if (!isTabActive()) return false;
		if (!fromHomepage.current) {
			if (showUrlModal) {
				hideUrlModal();
			}
		}
	}, [hideUrlModal, isTabActive, showUrlModal]);

	/**
	 * Set keyboard listeners
	 */
	useEffect(() => {
		const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', keyboardDidHide);
		return function cleanup() {
			keyboardDidHideListener.remove();
		};
	}, [keyboardDidHide]);

	/**
	 * Reload current page
	 */
	const reload = useCallback(() => {
		toggleOptionsIfNeeded();
		const { current } = webviewRef;
		current && current.reload();
	}, [toggleOptionsIfNeeded]);

	/**
	 * Handle when the drawer (app menu) is opened
	 */
	const drawerOpenHandler = useCallback(() => {
		dismissTextSelectionIfNeeded();
	}, [dismissTextSelectionIfNeeded]);

	/**
	 * Set initial url, dapp scripts and engine. Similar to componentDidMount
	 */
	useEffect(() => {
		approvedHosts = props.approvedHosts;
		const initialUrl = props.initialUrl || HOMEPAGE_URL;
		go(initialUrl, true);

		const getEntryScriptWeb3 = async () => {
			const entryScriptWeb3 = await EntryScriptWeb3.get();
			setEntryScriptWeb3(entryScriptWeb3 + SPA_urlChangeListener);
		};

		getEntryScriptWeb3();

		Engine.context.AssetsController.hub.on('pendingSuggestedAsset', suggestedAssetMeta => {
			if (!isTabActive()) return false;
			setSuggestedAssetMeta(suggestedAssetMeta);
			setWatchAsset(true);
		});

		// Listen to network changes
		Engine.context.TransactionController.hub.on('networkChange', reload);

		// Specify how to clean up after this effect:
		return function cleanup() {
			backgroundBridges.current.forEach(bridge => bridge.onDisconnect());

			// Remove all Engine listeners
			Engine.context.AssetsController.hub.removeAllListeners();
			Engine.context.TransactionController.hub.removeListener('networkChange', reload);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/**
	 * Enable the header to toggle the url modal and update other header data
	 */
	useEffect(() => {
		if (props.activeTab === props.id) {
			props.navigation.setParams({
				showUrlModal: toggleUrlModal,
				url: getMaskedUrl(url.current),
				icon: icon.current,
				error
			});
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [error, props.activeTab, props.id, toggleUrlModal]);

	useEffect(() => {
		if (Device.isAndroid()) {
			DrawerStatusTracker.hub.on('drawer::open', drawerOpenHandler);
		}

		return function cleanup() {
			if (Device.isAndroid()) {
				DrawerStatusTracker &&
					DrawerStatusTracker.hub &&
					DrawerStatusTracker.hub.removeListener('drawer::open', drawerOpenHandler);
			}
		};
	}, [drawerOpenHandler]);

	/**
	 * Set deeplinking listeners
	 */
	useEffect(() => {
		// Deeplink handling
		const unsubscribeFromBranch = Branch.subscribe(handleDeeplinks);

		// Check if there's a deeplink pending from launch
		const pendingDeeplink = DeeplinkManager.getPendingDeeplink();
		if (pendingDeeplink) {
			// Expire it to avoid duplicate actions
			DeeplinkManager.expireDeeplink();
			// Handle it
			setTimeout(() => {
				handleBranchDeeplink(pendingDeeplink);
			}, 1000);
		}

		return function cleanup() {
			unsubscribeFromBranch();
		};
	}, [handleBranchDeeplink, handleDeeplinks]);

	/**
	 * Set navigation listeners
	 */
	useEffect(() => {
		const handleAndroidBackPress = () => {
			if (!isTabActive()) return false;
			goBack();
			return true;
		};

		BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);

		// Handle hardwareBackPress event only for browser, not components rendered on top
		props.navigation.addListener('willFocus', () => {
			BackHandler.addEventListener('hardwareBackPress', handleAndroidBackPress);
		});
		props.navigation.addListener('willBlur', () => {
			BackHandler.removeEventListener('hardwareBackPress', handleAndroidBackPress);
		});

		return function cleanup() {
			BackHandler.removeEventListener('hardwareBackPress', handleAndroidBackPress);
		};

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [goBack, isTabActive]);

	/**
	 * Handles state changes for when the url changes
	 */
	const changeUrl = (siteInfo, type) => {
		setBackEnabled(siteInfo.canGoBack);
		setForwardEnabled(siteInfo.canGoForward);

		url.current = siteInfo.url;
		title.current = siteInfo.title;
		if (siteInfo.icon) icon.current = siteInfo.icon;

		isTabActive() &&
			props.navigation.setParams({
				url: getMaskedUrl(siteInfo.url),
				icon: siteInfo.icon,
				silent: true
			});

		props.updateTabInfo(getMaskedUrl(siteInfo.url), props.id);

		if (type !== 'start') {
			props.addToBrowserHistory({
				name: siteInfo.title,
				url: getMaskedUrl(siteInfo.url)
			});
		}

		if (isHomepage(siteInfo.url)) {
			injectHomePageScripts();
		}
	};

	/**
	 * Go to eth-phishing-detect page
	 */
	const goToETHPhishingDetector = () => {
		setShowPhishingModal(false);
		go(`https://github.com/metamask/eth-phishing-detect`);
	};

	/**
	 * Continue to phishing website
	 */
	const continueToPhishingSite = () => {
		const urlObj = new URL(blockedUrl);
		props.addToWhitelist(urlObj.hostname);
		setShowPhishingModal(false);
		blockedUrl !== url.current &&
			setTimeout(() => {
				go(blockedUrl);
				setBlockedUrl(undefined);
			}, 1000);
	};

	/**
	 * Go to etherscam website
	 */
	const goToEtherscam = () => {
		setShowPhishingModal(false);
		go(`https://etherscamdb.info/domain/meta-mask.com`);
	};

	/**
	 * Go to eth-phishing-detect issue
	 */
	const goToFilePhishingIssue = () => {
		setShowPhishingModal(false);
		go(`https://github.com/metamask/eth-phishing-detect/issues/new`);
	};

	/**
	 * Go back from phishing website alert
	 */
	const goBackToSafety = () => {
		blockedUrl === url.current && goBack();
		setTimeout(() => {
			setShowPhishingModal(false);
			setBlockedUrl(undefined);
		}, 500);
	};

	/**
	 * Renders the phishing modal
	 */
	const renderPhishingModal = () => (
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
				fullUrl={blockedUrl}
				goToETHPhishingDetector={goToETHPhishingDetector}
				continueToPhishingSite={continueToPhishingSite}
				goToEtherscam={goToEtherscam}
				goToFilePhishingIssue={goToFilePhishingIssue}
				goBackToSafety={goBackToSafety}
			/>
		</Modal>
	);

	/**
	 * Stops normal loading when it's ens, instead call go to be properly set up
	 */
	const onShouldStartLoadWithRequest = ({ url }) => {
		if (isENSUrl(url)) {
			go(url.replace(/^http:\/\//, 'https://'));
			return false;
		}
		return true;
	};

	/**
	 * Website started to load
	 */
	const onLoadStart = async ({ nativeEvent }) => {
		const { hostname } = new URL(nativeEvent.url);

		if (!isAllowedUrl(hostname)) {
			return handleNotAllowedUrl(nativeEvent.url);
		}
		webviewUrlPostMessagePromiseResolve.current = null;
		setError(false);
		changeUrl(nativeEvent, 'start');
		icon.current = null;

		// Reset the previous bridges
		backgroundBridges.current.length && backgroundBridges.current.forEach(bridge => bridge.onDisconnect());
		backgroundBridges.current = [];
		const origin = new URL(nativeEvent.url).origin;
		initializeBackgroundBridge(origin, true);
	};

	/**
	 * Sets loading bar progress
	 */
	const onLoadProgress = ({ nativeEvent: { progress } }) => {
		setProgress(progress);
	};

	/**
	 * When website finished loading
	 */
	const onLoadEnd = ({ nativeEvent }) => {
		const { current } = webviewRef;

		current && current.injectJavaScript(JS_WEBVIEW_URL);

		const promiseResolver = resolve => {
			webviewUrlPostMessagePromiseResolve.current = resolve;
		};
		const promise = current ? new Promise(promiseResolver) : Promise.resolve(url.current);

		promise.then(info => {
			if (info.url === nativeEvent.url) {
				changeUrl({ ...nativeEvent, icon: info.icon }, 'end-promise');
			}
		});
	};

	/**
	 * Handle message from website
	 */
	const onMessage = ({ nativeEvent: { data } }) => {
		try {
			data = typeof data === 'string' ? JSON.parse(data) : data;
			if (!data || (!data.type && !data.name)) {
				return;
			}
			if (data.name) {
				backgroundBridges.current.forEach(bridge => {
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
					onFrameLoadStarted(url);
					break;
				}
				case 'GET_WEBVIEW_URL':
					webviewUrlPostMessagePromiseResolve.current &&
						webviewUrlPostMessagePromiseResolve.current(data.payload);
			}
		} catch (e) {
			Logger.error(e, `Browser::onMessage on ${url.current}`);
		}
	};

	/**
	 * Go to home page, reload if already on homepage
	 */
	const goToHomepage = async () => {
		toggleOptionsIfNeeded();
		if (url.current === HOMEPAGE_URL) return reload();
		await go(HOMEPAGE_URL);
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_HOME);
	};

	/**
	 * Render the progress bar
	 */
	const renderProgressBar = () => (
		<View style={styles.progressBarWrapper}>
			<WebviewProgressBar progress={progress} />
		</View>
	);

	/**
	 * When url input changes
	 */
	const onURLChange = inputValue => {
		setAutocompleteValue(inputValue);
	};

	/**
	 * Handle url input submit
	 */
	const onUrlInputSubmit = async (input = null) => {
		const inputValue = (typeof input === 'string' && input) || autocompleteValue;
		if (!inputValue) {
			toggleUrlModal();
			return;
		}
		const { defaultProtocol, searchEngine } = props;
		const sanitizedInput = onUrlSubmit(inputValue, searchEngine, defaultProtocol);
		await go(sanitizedInput);
		toggleUrlModal();
	};

	/**
	 * Render url input modal
	 */
	const renderUrlModal = () => {
		if (showUrlModal && inputRef) {
			setTimeout(() => {
				const { current } = inputRef;
				if (current && !current.isFocused()) {
					current.focus();
				}
			}, ANIMATION_TIMING);
		}

		return (
			<Modal
				isVisible={showUrlModal}
				style={styles.urlModal}
				onBackdropPress={toggleUrlModal}
				onBackButtonPress={toggleUrlModal}
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
						ref={inputRef}
						autoCapitalize="none"
						autoCorrect={false}
						clearButtonMode="while-editing"
						testID={'url-input'}
						onChangeText={onURLChange}
						onSubmitEditing={onUrlInputSubmit}
						placeholder={strings('autocomplete.placeholder')}
						placeholderTextColor={colors.grey400}
						returnKeyType="go"
						style={styles.urlInput}
						value={autocompleteValue}
						selectTextOnFocus
					/>

					{Device.isAndroid() ? (
						<TouchableOpacity
							onPress={() => (!autocompleteValue ? setShowUrlModal(false) : setAutocompleteValue(''))}
							style={styles.iconCloseButton}
						>
							<MaterialIcon name="close" size={20} style={[styles.icon, styles.iconClose]} />
						</TouchableOpacity>
					) : (
						<TouchableOpacity
							style={styles.cancelButton}
							testID={'cancel-url-button'}
							onPress={toggleUrlModal}
						>
							<Text style={styles.cancelButtonText}>{strings('browser.cancel')}</Text>
						</TouchableOpacity>
					)}
				</View>
				<UrlAutocomplete onSubmit={onUrlInputSubmit} input={autocompleteValue} onDismiss={toggleUrlModal} />
			</Modal>
		);
	};

	/**
	 * Handle error, for example, ssl certificate error
	 */
	const onError = ({ nativeEvent: errorInfo }) => {
		Logger.log(errorInfo);
		props.navigation.setParams({
			error: true
		});
		setError(errorInfo);
	};

	/**
	 * Add bookmark
	 */
	const addBookmark = () => {
		toggleOptionsIfNeeded();
		props.navigation.push('AddBookmarkView', {
			title: title.current || '',
			url: getMaskedUrl(url.current),
			onAddBookmark: async ({ name, url }) => {
				props.addBookmark({ name, url });
				if (Device.isIos()) {
					const item = {
						uniqueIdentifier: url,
						title: name || getMaskedUrl(url),
						contentDescription: `Launch ${name || url} on MetaMask`,
						keywords: [name.split(' '), url, 'dapp'],
						thumbnail: {
							uri: icon.current || `https://api.faviconkit.com/${getHost(url)}/256`
						}
					};
					try {
						SearchApi.indexSpotlightItem(item);
					} catch (e) {
						Logger.error(e, 'Error adding to spotlight');
					}
				}
			}
		});

		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_ADD_TO_FAVORITE);
	};

	/**
	 * Share url
	 */
	const share = () => {
		toggleOptionsIfNeeded();
		Share.open({
			url: url.current
		}).catch(err => {
			Logger.log('Error while trying to share address', err);
		});
	};

	/**
	 * Open external link
	 */
	const openInBrowser = () => {
		toggleOptionsIfNeeded();
		Linking.openURL(url.current).catch(error =>
			Logger.log(`Error while trying to open external link: ${url.current}`, error)
		);
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.DAPP_OPEN_IN_BROWSER);
	};

	/**
	 * Render non-homepage options menu
	 */
	const renderNonHomeOptions = () => {
		if (isHomepage()) return null;

		return (
			<React.Fragment>
				<Button onPress={reload} style={styles.option}>
					<View style={styles.optionIconWrapper}>
						<Icon name="refresh" size={15} style={styles.optionIcon} />
					</View>
					<Text style={styles.optionText} numberOfLines={1}>
						{strings('browser.reload')}
					</Text>
				</Button>
				{!isBookmark() && (
					<Button onPress={addBookmark} style={styles.option}>
						<View style={styles.optionIconWrapper}>
							<Icon name="star" size={16} style={styles.optionIcon} />
						</View>
						<Text style={styles.optionText} numberOfLines={1}>
							{strings('browser.add_to_favorites')}
						</Text>
					</Button>
				)}
				<Button onPress={share} style={styles.option}>
					<View style={styles.optionIconWrapper}>
						<Icon name="share" size={15} style={styles.optionIcon} />
					</View>
					<Text style={styles.optionText} numberOfLines={1}>
						{strings('browser.share')}
					</Text>
				</Button>
				<Button onPress={openInBrowser} style={styles.option}>
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

	/**
	 * Handle new tab button press
	 */
	const onNewTabPress = () => {
		openNewTab();
	};

	/**
	 * Handle switch network press
	 */
	const switchNetwork = () => {
		toggleOptionsIfNeeded();
		props.toggleNetworkModal();
	};

	/**
	 * Render options menu
	 */
	const renderOptions = () => {
		if (showOptions) {
			return (
				<TouchableWithoutFeedback onPress={toggleOptions}>
					<View style={styles.optionsOverlay}>
						<View
							style={[
								styles.optionsWrapper,
								Device.isAndroid() ? styles.optionsWrapperAndroid : styles.optionsWrapperIos
							]}
						>
							<Button onPress={onNewTabPress} style={styles.option}>
								<View style={styles.optionIconWrapper}>
									<MaterialCommunityIcon name="plus" size={18} style={styles.optionIcon} />
								</View>
								<Text style={styles.optionText} numberOfLines={1}>
									{strings('browser.new_tab')}
								</Text>
							</Button>
							{renderNonHomeOptions()}
							<Button onPress={switchNetwork} style={styles.option}>
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

	/**
	 * Show the different tabs
	 */
	const showTabs = () => {
		dismissTextSelectionIfNeeded();
		props.showTabs();
	};

	/**
	 * Render the bottom (navigation/options) bar
	 */
	const renderBottomBar = () => (
		<BrowserBottomBar
			canGoBack={backEnabled}
			canGoForward={forwardEnabled}
			goForward={goForward}
			goBack={goBack}
			showTabs={showTabs}
			showUrlModal={toggleUrlModal}
			toggleOptions={toggleOptions}
			goHome={goToHomepage}
		/>
	);

	/**
	 * Render the modal that asks the user to approve/reject connections to a dapp
	 */
	const renderApprovalModal = () => {
		const showApprovalDialogNow =
			showApprovalDialog && showApprovalDialogHostname === new URL(url.current).hostname;
		return (
			<Modal
				isVisible={showApprovalDialogNow}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={onAccountsReject}
				onBackdropPress={onAccountsReject}
				swipeDirection={'down'}
			>
				<AccountApproval
					onCancel={onAccountsReject}
					onConfirm={onAccountsConfirm}
					currentPageInformation={{
						title: title.current,
						url: getMaskedUrl(url.current),
						icon: icon.current
					}}
				/>
			</Modal>
		);
	};

	/**
	 * On rejection addinga an asset
	 */
	const onCancelWatchAsset = () => {
		setWatchAsset(false);
	};

	/**
	 * Render the add asset modal
	 */
	const renderWatchAssetModal = () => (
		<Modal
			isVisible={watchAsset}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			onBackdropPress={onCancelWatchAsset}
			onSwipeComplete={onCancelWatchAsset}
			swipeDirection={'down'}
			propagateSwipe
		>
			<WatchAssetRequest
				onCancel={onCancelWatchAsset}
				onConfirm={onCancelWatchAsset}
				suggestedAssetMeta={suggestedAssetMeta}
			/>
		</Modal>
	);

	/**
	 * Render the onboarding wizard browser step
	 */
	const renderOnboardingWizard = () => {
		const { wizardStep } = props;
		if ([6].includes(wizardStep)) {
			if (!wizardScrollAdjusted) {
				setTimeout(() => {
					reload();
				}, 1);
				wizardScrollAdjusted = true;
			}
			return <OnboardingWizard navigation={props.navigation} />;
		}
		return null;
	};

	/**
	 * Main render
	 */
	return (
		<View
			style={[styles.wrapper, !isTabActive() && styles.hide]}
			{...(Device.isAndroid() ? { collapsable: false } : {})}
		>
			<View style={styles.webview}>
				{!!entryScriptWeb3 && firstUrlLoaded && (
					<WebView
						ref={webviewRef}
						renderError={() => <WebviewError error={error} onReload={() => null} />}
						source={{ uri: initialUrl }}
						injectedJavaScriptBeforeContentLoaded={entryScriptWeb3}
						style={styles.webview}
						onLoadStart={onLoadStart}
						onLoadEnd={onLoadEnd}
						onLoadProgress={onLoadProgress}
						onMessage={onMessage}
						onError={onError}
						onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
						userAgent={USER_AGENT}
						sendCookies
						javascriptEnabled
						allowsInlineMediaPlayback
						useWebkit
						testID={'browser-webview'}
					/>
				)}
			</View>
			{renderProgressBar()}
			{isTabActive() && renderPhishingModal()}
			{isTabActive() && renderUrlModal()}
			{isTabActive() && renderApprovalModal()}
			{isTabActive() && renderWatchAssetModal()}
			{isTabActive() && renderOptions()}
			{isTabActive() && renderBottomBar()}
			{isTabActive() && renderOnboardingWizard()}
		</View>
	);
};

BrowserTab.propTypes = {
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

BrowserTab.defaultProps = {
	defaultProtocol: 'https://'
};

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
