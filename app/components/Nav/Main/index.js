import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
	ActivityIndicator,
	AppState,
	StyleSheet,
	View,
	Alert,
	InteractionManager,
	PushNotificationIOS, // eslint-disable-line react-native/split-platform-components
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import GlobalAlert from '../../UI/GlobalAlert';
import BackgroundTimer from 'react-native-background-timer';
import Approval from '../../Views/Approval';
import NotificationManager from '../../../core/NotificationManager';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import PushNotification from 'react-native-push-notification';
import I18n, { strings } from '../../../../locales/i18n';
import { colors } from '../../../styles/common';
import LockManager from '../../../core/LockManager';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import { hexToBN, fromWei } from '../../../util/number';
import { setEtherTransaction, setTransactionObject } from '../../../actions/transaction';
import PersonalSign from '../../UI/PersonalSign';
import TypedSign from '../../UI/TypedSign';
import Modal from 'react-native-modal';
import WalletConnect from '../../../core/WalletConnect';
import Device from '../../../util/device';
import {
	getMethodData,
	TOKEN_METHOD_TRANSFER,
	APPROVE_FUNCTION_SIGNATURE,
	decodeApproveData,
	getTokenValueParam,
	getTokenAddressParam,
	calcTokenAmount,
	getTokenValueParamAsHex,
} from '../../../util/transactions';
import { BN } from 'ethereumjs-util';
import Logger from '../../../util/Logger';
import MessageSign from '../../UI/MessageSign';
import Approve from '../../Views/ApproveView/Approve';
import TransactionTypes from '../../../core/TransactionTypes';
import BackupAlert from '../../UI/BackupAlert';
import Notification from '../../UI/Notification';
import FiatOrders from '../../UI/FiatOrders';
import {
	showTransactionNotification,
	hideCurrentNotification,
	showSimpleNotification,
	removeNotificationById,
	removeNotVisibleNotifications,
} from '../../../actions/notification';
import { toggleDappTransactionModal, toggleApproveModal } from '../../../actions/modals';
import AccountApproval from '../../UI/AccountApproval';
import ProtectYourWalletModal from '../../UI/ProtectYourWalletModal';
import MainNavigator from './MainNavigator';
import SkipAccountSecurityModal from '../../UI/SkipAccountSecurityModal';
import { swapsUtils } from '@metamask/swaps-controller';
import { util } from '@metamask/controllers';
import SwapsLiveness from '../../UI/Swaps/SwapsLiveness';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import BigNumber from 'bignumber.js';
import { setInfuraAvailabilityBlocked, setInfuraAvailabilityNotBlocked } from '../../../actions/infuraAvailability';
import { getTokenList } from '../../../reducers/tokens';
import { toLowerCaseEquals } from '../../../util/general';
import { ethers } from 'ethers';
import abi from 'human-standard-token-abi';

const hstInterface = new ethers.utils.Interface(abi);

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0,
	},
});
const Main = (props) => {
	const [connected, setConnected] = useState(true);
	const [forceReload, setForceReload] = useState(false);
	const [signMessage, setSignMessage] = useState(false);
	const [signMessageParams, setSignMessageParams] = useState({ data: '' });
	const [signType, setSignType] = useState(false);
	const [walletConnectRequest, setWalletConnectRequest] = useState(false);
	const [walletConnectRequestInfo, setWalletConnectRequestInfo] = useState(false);
	const [showExpandedMessage, setShowExpandedMessage] = useState(false);
	const [currentPageTitle, setCurrentPageTitle] = useState('');
	const [currentPageUrl, setCurrentPageUrl] = useState('');
	const [showRemindLaterModal, setShowRemindLaterModal] = useState(false);
	const [skipCheckbox, setSkipCheckbox] = useState(false);

	const backgroundMode = useRef(false);
	const locale = useRef(I18n.locale);
	const lockManager = useRef();
	const removeConnectionStatusListener = useRef();

	const tokenList = useSelector(getTokenList);

	const setTransactionObject = props.setTransactionObject;
	const toggleApproveModal = props.toggleApproveModal;
	const toggleDappTransactionModal = props.toggleDappTransactionModal;
	const setEtherTransaction = props.setEtherTransaction;
	const removeNotVisibleNotifications = props.removeNotVisibleNotifications;

	const usePrevious = (value) => {
		const ref = useRef();
		useEffect(() => {
			ref.current = value;
		});
		return ref.current;
	};

	const prevLockTime = usePrevious(props.lockTime);

	const pollForIncomingTransactions = useCallback(async () => {
		props.thirdPartyApiMode && (await Engine.refreshTransactionHistory());
		// Stop polling if the app is in the background
		if (!backgroundMode.current) {
			setTimeout(() => {
				pollForIncomingTransactions();
			}, AppConstants.TX_CHECK_NORMAL_FREQUENCY);
		}
	}, [backgroundMode, props.thirdPartyApiMode]);

	const onUnapprovedMessage = (messageParams, type) => {
		const { title: currentPageTitle, url: currentPageUrl } = messageParams.meta;
		delete messageParams.meta;
		setSignMessageParams(messageParams);
		setSignType(type);
		setCurrentPageTitle(currentPageTitle);
		setCurrentPageUrl(currentPageUrl);
		setSignMessage(true);
	};

	const connectionChangeHandler = useCallback(
		(state) => {
			if (!state) return;
			const { isConnected } = state;
			// Show the modal once the status changes to offline
			if (connected && isConnected === false) {
				props.navigation.navigate('OfflineModeView');
			}
			if (connected !== isConnected && isConnected !== null) {
				setConnected(isConnected);
			}
		},
		[connected, setConnected, props.navigation]
	);

	const checkInfuraAvailability = useCallback(async () => {
		if (props.providerType !== 'rpc') {
			try {
				const { TransactionController } = Engine.context;
				await util.query(TransactionController.ethQuery, 'blockNumber', []);
				props.setInfuraAvailabilityNotBlocked();
			} catch (e) {
				if (e.message === AppConstants.ERRORS.INFURA_BLOCKED_MESSAGE) {
					props.navigation.navigate('OfflineModeView');
					props.setInfuraAvailabilityBlocked();
				}
			}
		} else {
			props.setInfuraAvailabilityNotBlocked();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		props.navigation,
		props.providerType,
		props.setInfuraAvailabilityBlocked,
		props.setInfuraAvailabilityNotBlocked,
	]);

	const initializeWalletConnect = () => {
		WalletConnect.hub.on('walletconnectSessionRequest', (peerInfo) => {
			setWalletConnectRequest(true);
			setWalletConnectRequestInfo(peerInfo);
		});
		WalletConnect.init();
	};

	const trackSwaps = useCallback(
		async (event, transactionMeta) => {
			try {
				const { TransactionController } = Engine.context;
				const newSwapsTransactions = props.swapsTransactions;
				const swapTransaction = newSwapsTransactions[transactionMeta.id];
				const { sentAt, gasEstimate, ethAccountBalance, approvalTransactionMetaId } =
					swapTransaction.paramsForAnalytics;

				const approvalTransaction = TransactionController.state.transactions.find(
					({ id }) => id === approvalTransactionMetaId
				);
				const ethBalance = await util.query(TransactionController.ethQuery, 'getBalance', [
					props.selectedAddress,
				]);
				const receipt = await util.query(TransactionController.ethQuery, 'getTransactionReceipt', [
					transactionMeta.transactionHash,
				]);

				const currentBlock = await util.query(TransactionController.ethQuery, 'getBlockByHash', [
					receipt.blockHash,
					false,
				]);
				let approvalReceipt;
				if (approvalTransaction?.transactionHash) {
					approvalReceipt = await util.query(TransactionController.ethQuery, 'getTransactionReceipt', [
						approvalTransaction.transactionHash,
					]);
				}
				const tokensReceived = swapsUtils.getSwapsTokensReceived(
					receipt,
					approvalReceipt,
					transactionMeta?.transaction,
					approvalTransaction?.transaction,
					swapTransaction.destinationToken,
					ethAccountBalance,
					ethBalance
				);

				newSwapsTransactions[transactionMeta.id].gasUsed = receipt.gasUsed;
				if (tokensReceived) {
					newSwapsTransactions[transactionMeta.id].receivedDestinationAmount = new BigNumber(
						tokensReceived,
						16
					).toString(10);
				}
				TransactionController.update({ swapsTransactions: newSwapsTransactions });

				const timeToMine = currentBlock.timestamp - sentAt;
				const estimatedVsUsedGasRatio = `${new BigNumber(receipt.gasUsed)
					.div(gasEstimate)
					.times(100)
					.toFixed(2)}%`;
				const quoteVsExecutionRatio = `${swapsUtils
					.calcTokenAmount(tokensReceived || '0x0', swapTransaction.destinationTokenDecimals)
					.div(swapTransaction.destinationAmount)
					.times(100)
					.toFixed(2)}%`;
				const tokenToAmountReceived = swapsUtils.calcTokenAmount(
					tokensReceived,
					swapTransaction.destinationToken.decimals
				);
				const analyticsParams = { ...swapTransaction.analytics };
				delete newSwapsTransactions[transactionMeta.id].analytics;
				delete newSwapsTransactions[transactionMeta.id].paramsForAnalytics;

				InteractionManager.runAfterInteractions(() => {
					const parameters = {
						...analyticsParams,
						time_to_mine: timeToMine,
						estimated_vs_used_gasRatio: estimatedVsUsedGasRatio,
						quote_vs_executionRatio: quoteVsExecutionRatio,
						token_to_amount_received: tokenToAmountReceived.toString(),
					};
					Analytics.trackEventWithParameters(event, {});
					Analytics.trackEventWithParameters(event, parameters, true);
				});
			} catch (e) {
				Logger.error(e, ANALYTICS_EVENT_OPTS.SWAP_TRACKING_FAILED);
				InteractionManager.runAfterInteractions(() => {
					Analytics.trackEvent(ANALYTICS_EVENT_OPTS.SWAP_TRACKING_FAILED, { error: e });
				});
			}
		},
		[props.selectedAddress, props.swapsTransactions]
	);

	const autoSign = useCallback(
		async (transactionMeta) => {
			const { TransactionController } = Engine.context;
			try {
				TransactionController.hub.once(`${transactionMeta.id}:finished`, (transactionMeta) => {
					if (transactionMeta.status === 'submitted') {
						props.navigation.pop?.();
						NotificationManager.watchSubmittedTransaction({
							...transactionMeta,
							assetType: transactionMeta.transaction.assetType,
						});
					} else {
						if (props.swapsTransactions[transactionMeta.id]?.analytics) {
							trackSwaps(ANALYTICS_EVENT_OPTS.SWAP_FAILED, transactionMeta);
						}
						throw transactionMeta.error;
					}
				});
				TransactionController.hub.once(`${transactionMeta.id}:confirmed`, (transactionMeta) => {
					if (props.swapsTransactions[transactionMeta.id]?.analytics) {
						trackSwaps(ANALYTICS_EVENT_OPTS.SWAP_COMPLETED, transactionMeta);
					}
				});
				await TransactionController.approveTransaction(transactionMeta.id);
			} catch (error) {
				Alert.alert(strings('transactions.transaction_error'), error && error.message, [
					{ text: strings('navigation.ok') },
				]);
				Logger.error(error, 'error while trying to send transaction (Main)');
			}
		},
		[props.navigation, props.swapsTransactions, trackSwaps]
	);

	const onUnapprovedTransaction = useCallback(
		async (transactionMeta) => {
			if (transactionMeta.origin === TransactionTypes.MMM) return;

			const to = transactionMeta.transaction.to?.toLowerCase();
			const { data } = transactionMeta.transaction;

			// if approval data includes metaswap contract
			// if destination address is metaswap contract
			if (
				transactionMeta.origin === process.env.MM_FOX_CODE &&
				to &&
				(swapsUtils.isValidContractAddress(props.chainId, to) ||
					(data &&
						data.substr(0, 10) === APPROVE_FUNCTION_SIGNATURE &&
						decodeApproveData(data).spenderAddress?.toLowerCase() ===
							swapsUtils.getSwapsContractAddress(props.chainId)))
			) {
				autoSign(transactionMeta);
			} else {
				const {
					transaction: { value, gas, gasPrice, data },
				} = transactionMeta;
				const { AssetsContractController } = Engine.context;
				transactionMeta.transaction.gas = hexToBN(gas);
				transactionMeta.transaction.gasPrice = hexToBN(gasPrice);
				if (
					(value === '0x0' || !value) &&
					data &&
					data !== '0x' &&
					to &&
					(await getMethodData(data)).name === TOKEN_METHOD_TRANSFER
				) {
					let asset = props.tokens.find(({ address }) => toLowerCaseEquals(address, to));
					if (!asset) {
						// try to lookup contract by lowercased address `to`
						asset = tokenList[to];

						if (!asset) {
							try {
								asset = {};
								asset.decimals = await AssetsContractController.getTokenDecimals(to);
								asset.symbol = await AssetsContractController.getAssetSymbol(to);
								// adding `to` here as well
								asset.address = to;
							} catch (e) {
								// This could fail when requesting a transfer in other network
								// adding `to` here as well
								asset = { symbol: 'ERC20', decimals: new BN(0), address: to };
							}
						}
					}

					const tokenData = hstInterface.parseTransaction({ data });
					const tokenValue = getTokenValueParam(tokenData);
					const toAddress = getTokenAddressParam(tokenData);
					const tokenAmount = tokenData && calcTokenAmount(tokenValue, asset.decimals).toFixed();

					transactionMeta.transaction.value = hexToBN(getTokenValueParamAsHex(tokenData));
					transactionMeta.transaction.readableValue = tokenAmount;
					transactionMeta.transaction.to = toAddress;

					setTransactionObject({
						type: 'INDIVIDUAL_TOKEN_TRANSACTION',
						selectedAsset: asset,
						id: transactionMeta.id,
						origin: transactionMeta.origin,
						...transactionMeta.transaction,
					});
				} else {
					transactionMeta.transaction.value = hexToBN(value);
					transactionMeta.transaction.readableValue = fromWei(transactionMeta.transaction.value);

					setEtherTransaction({
						id: transactionMeta.id,
						origin: transactionMeta.origin,
						...transactionMeta.transaction,
					});
				}

				if (data && data.substr(0, 10) === APPROVE_FUNCTION_SIGNATURE) {
					toggleApproveModal();
				} else {
					toggleDappTransactionModal();
				}
			}
		},
		[
			props.tokens,
			props.chainId,
			setEtherTransaction,
			setTransactionObject,
			toggleApproveModal,
			toggleDappTransactionModal,
			autoSign,
			tokenList,
		]
	);

	const handleAppStateChange = useCallback(
		(appState) => {
			const newModeIsBackground = appState === 'background';
			// If it was in background and it's not anymore
			// we need to stop the Background timer
			if (backgroundMode.current && !newModeIsBackground) {
				BackgroundTimer.stop();
				pollForIncomingTransactions();
			}

			backgroundMode.current = newModeIsBackground;

			// If the app is now in background, we need to start
			// the background timer, which is less intense
			if (backgroundMode.current) {
				removeNotVisibleNotifications();
				BackgroundTimer.runBackgroundTimer(async () => {
					await Engine.refreshTransactionHistory();
				}, AppConstants.TX_CHECK_BACKGROUND_FREQUENCY);
			}
		},
		[backgroundMode, removeNotVisibleNotifications, pollForIncomingTransactions]
	);

	const initForceReload = () => {
		// Force unmount the webview to avoid caching problems
		setForceReload(true);
		setTimeout(() => {
			setForceReload(false);
		}, 1000);
	};

	const renderLoader = () => (
		<View style={styles.loader}>
			<ActivityIndicator size="small" />
		</View>
	);

	const onSignAction = () => setSignMessage(false);

	const toggleExpandedMessage = () => setShowExpandedMessage(!showExpandedMessage);

	const renderSigningModal = () => (
		<Modal
			isVisible={signMessage}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			onBackdropPress={onSignAction}
			onBackButtonPress={showExpandedMessage ? toggleExpandedMessage : onSignAction}
			onSwipeComplete={onSignAction}
			swipeDirection={'down'}
			propagateSwipe
		>
			{signType === 'personal' && (
				<PersonalSign
					navigation={props.navigation}
					messageParams={signMessageParams}
					onCancel={onSignAction}
					onConfirm={onSignAction}
					currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					toggleExpandedMessage={toggleExpandedMessage}
					showExpandedMessage={showExpandedMessage}
				/>
			)}
			{signType === 'typed' && (
				<TypedSign
					navigation={props.navigation}
					messageParams={signMessageParams}
					onCancel={onSignAction}
					onConfirm={onSignAction}
					currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					toggleExpandedMessage={toggleExpandedMessage}
					showExpandedMessage={showExpandedMessage}
				/>
			)}
			{signType === 'eth' && (
				<MessageSign
					navigation={props.navigation}
					messageParams={signMessageParams}
					onCancel={onSignAction}
					onConfirm={onSignAction}
					currentPageInformation={{ title: currentPageTitle, url: currentPageUrl }}
					toggleExpandedMessage={toggleExpandedMessage}
					showExpandedMessage={showExpandedMessage}
				/>
			)}
		</Modal>
	);

	const onWalletConnectSessionApproval = () => {
		const { peerId } = walletConnectRequestInfo;
		setWalletConnectRequest(false);
		setWalletConnectRequestInfo({});
		WalletConnect.hub.emit('walletconnectSessionRequest::approved', peerId);
	};

	const onWalletConnectSessionRejected = () => {
		const peerId = walletConnectRequestInfo.peerId;
		setWalletConnectRequest(false);
		setWalletConnectRequestInfo({});
		WalletConnect.hub.emit('walletconnectSessionRequest::rejected', peerId);
	};

	const renderWalletConnectSessionRequestModal = () => {
		const meta = walletConnectRequestInfo.peerMeta || null;
		return (
			<Modal
				isVisible={walletConnectRequest}
				animationIn="slideInUp"
				animationOut="slideOutDown"
				style={styles.bottomModal}
				backdropOpacity={0.7}
				animationInTiming={300}
				animationOutTiming={300}
				onSwipeComplete={onWalletConnectSessionRejected}
				onBackButtonPress={onWalletConnectSessionRejected}
				swipeDirection={'down'}
			>
				<AccountApproval
					onCancel={onWalletConnectSessionRejected}
					onConfirm={onWalletConnectSessionApproval}
					currentPageInformation={{
						title: meta && meta.name,
						url: meta && meta.url,
					}}
					walletConnectRequest
				/>
			</Modal>
		);
	};

	const renderDappTransactionModal = () =>
		props.dappTransactionModalVisible && (
			<Approval
				navigation={props.navigation}
				dappTransactionModalVisible
				toggleDappTransactionModal={props.toggleDappTransactionModal}
			/>
		);

	const renderApproveModal = () =>
		props.approveModalVisible && <Approve modalVisible toggleApproveModal={props.toggleApproveModal} />;

	const toggleRemindLater = () => {
		setShowRemindLaterModal(!showRemindLaterModal);
	};

	const toggleSkipCheckbox = () => {
		setSkipCheckbox(!skipCheckbox);
	};

	const skipAccountModalSecureNow = () => {
		toggleRemindLater();
		props.navigation.navigate('SetPasswordFlow', {
			screen: 'AccountBackupStep1B',
			params: { ...props.route.params },
		});
	};

	const skipAccountModalSkip = () => {
		if (skipCheckbox) toggleRemindLater();
	};

	useEffect(() => {
		if (locale.current !== I18n.locale) {
			locale.current = I18n.locale;
			initForceReload();
			return;
		}
		if (prevLockTime !== props.lockTime) {
			lockManager.current && lockManager.current.updateLockTime(props.lockTime);
		}
	});

	// Remove all notifications that aren't visible
	useEffect(() => {
		removeNotVisibleNotifications();
	}, [removeNotVisibleNotifications]);

	// unapprovedTransaction effect
	useEffect(() => {
		Engine.context.TransactionController.hub.on('unapprovedTransaction', onUnapprovedTransaction);
		return () => {
			Engine.context.TransactionController.hub.removeListener('unapprovedTransaction', onUnapprovedTransaction);
		};
	}, [onUnapprovedTransaction]);

	useEffect(() => {
		initializeWalletConnect();
		AppState.addEventListener('change', handleAppStateChange);
		lockManager.current = new LockManager(props.navigation, props.lockTime);
		PushNotification.configure({
			requestPermissions: false,
			onNotification: (notification) => {
				let data = null;
				if (Device.isAndroid()) {
					if (notification.tag) {
						data = JSON.parse(notification.tag);
					}
				} else if (notification.data) {
					data = notification.data;
				}
				if (data && data.action === 'tx') {
					if (data.id) {
						NotificationManager.setTransactionToView(data.id);
					}
					props.navigation.navigate('TransactionsHome');
				}

				if (Device.isIos()) {
					notification.finish(PushNotificationIOS.FetchResult.NoData);
				}
			},
		});

		Engine.context.MessageManager.hub.on('unapprovedMessage', (messageParams) =>
			onUnapprovedMessage(messageParams, 'eth')
		);

		Engine.context.PersonalMessageManager.hub.on('unapprovedMessage', (messageParams) =>
			onUnapprovedMessage(messageParams, 'personal')
		);

		Engine.context.TypedMessageManager.hub.on('unapprovedMessage', (messageParams) =>
			onUnapprovedMessage(messageParams, 'typed')
		);

		setTimeout(() => {
			NotificationManager.init({
				navigation: props.navigation,
				showTransactionNotification: props.showTransactionNotification,
				hideCurrentNotification: props.hideCurrentNotification,
				showSimpleNotification: props.showSimpleNotification,
				removeNotificationById: props.removeNotificationById,
			});
			pollForIncomingTransactions();
			checkInfuraAvailability();
			removeConnectionStatusListener.current = NetInfo.addEventListener(connectionChangeHandler);
		}, 1000);

		return function cleanup() {
			AppState.removeEventListener('change', handleAppStateChange);
			lockManager.current.stopListening();
			Engine.context.PersonalMessageManager.hub.removeAllListeners();
			Engine.context.TypedMessageManager.hub.removeAllListeners();
			WalletConnect.hub.removeAllListeners();
			removeConnectionStatusListener.current && removeConnectionStatusListener.current();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<React.Fragment>
			<View style={styles.flex}>
				{!forceReload ? <MainNavigator navigation={props.navigation} /> : renderLoader()}
				<GlobalAlert />
				<FadeOutOverlay />
				<Notification navigation={props.navigation} />
				<FiatOrders />
				<SwapsLiveness />
				<BackupAlert onDismiss={toggleRemindLater} navigation={props.navigation} />
				<SkipAccountSecurityModal
					modalVisible={showRemindLaterModal}
					onCancel={skipAccountModalSecureNow}
					onConfirm={skipAccountModalSkip}
					skipCheckbox={skipCheckbox}
					onPress={skipAccountModalSkip}
					toggleSkipCheckbox={toggleSkipCheckbox}
				/>
				<ProtectYourWalletModal navigation={props.navigation} />
			</View>
			{renderSigningModal()}
			{renderWalletConnectSessionRequestModal()}
			{renderDappTransactionModal()}
			{renderApproveModal()}
		</React.Fragment>
	);
};

Main.router = MainNavigator.router;

Main.propTypes = {
	swapsTransactions: PropTypes.object,
	/**
	 * Object that represents the navigator
	 */
	navigation: PropTypes.object,
	/**
	 * Time to auto-lock the app after it goes in background mode
	 */
	lockTime: PropTypes.number,
	/**
	 * Action that sets an ETH transaction
	 */
	setEtherTransaction: PropTypes.func,
	/**
	 * Action that sets a transaction
	 */
	setTransactionObject: PropTypes.func,
	/**
	 * Array of ERC20 assets
	 */
	tokens: PropTypes.array,
	/**
	 * Dispatch showing a transaction notification
	 */
	showTransactionNotification: PropTypes.func,
	/**
	 * Dispatch showing a simple notification
	 */
	showSimpleNotification: PropTypes.func,
	/**
	 * Dispatch hiding a transaction notification
	 */
	hideCurrentNotification: PropTypes.func,
	removeNotificationById: PropTypes.func,
	/**
	 * Indicates whether third party API mode is enabled
	 */
	thirdPartyApiMode: PropTypes.bool,
	/**
	/* Hides or shows dApp transaction modal
	*/
	toggleDappTransactionModal: PropTypes.func,
	/**
	/* Hides or shows approve modal
	*/
	toggleApproveModal: PropTypes.func,
	/**
	/* dApp transaction modal visible or not
	*/
	dappTransactionModalVisible: PropTypes.bool,
	/**
	/* Token approve modal visible or not
	*/
	approveModalVisible: PropTypes.bool,
	/**
	 * Selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * Chain id
	 */
	chainId: PropTypes.string,
	/**
	 * Network provider type
	 */
	providerType: PropTypes.string,
	/**
	 * Dispatch infura availability blocked
	 */
	setInfuraAvailabilityBlocked: PropTypes.func,
	/**
	 * Dispatch infura availability not blocked
	 */
	setInfuraAvailabilityNotBlocked: PropTypes.func,
	/**
	 * Remove not visible notifications from state
	 */
	removeNotVisibleNotifications: PropTypes.func,
	/**
	 * Object that represents the current route info like params passed to it
	 */
	route: PropTypes.object,
};

const mapStateToProps = (state) => ({
	lockTime: state.settings.lockTime,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	tokens: state.engine.backgroundState.TokensController.tokens,
	dappTransactionModalVisible: state.modals.dappTransactionModalVisible,
	approveModalVisible: state.modals.approveModalVisible,
	swapsTransactions: state.engine.backgroundState.TransactionController.swapsTransactions || {},
	providerType: state.engine.backgroundState.NetworkController.provider.type,
});

const mapDispatchToProps = (dispatch) => ({
	setEtherTransaction: (transaction) => dispatch(setEtherTransaction(transaction)),
	setTransactionObject: (transaction) => dispatch(setTransactionObject(transaction)),
	showTransactionNotification: (args) => dispatch(showTransactionNotification(args)),
	showSimpleNotification: (args) => dispatch(showSimpleNotification(args)),
	hideCurrentNotification: () => dispatch(hideCurrentNotification()),
	removeNotificationById: (id) => dispatch(removeNotificationById(id)),
	toggleDappTransactionModal: (show = null) => dispatch(toggleDappTransactionModal(show)),
	toggleApproveModal: (show) => dispatch(toggleApproveModal(show)),
	setInfuraAvailabilityBlocked: () => dispatch(setInfuraAvailabilityBlocked()),
	setInfuraAvailabilityNotBlocked: () => dispatch(setInfuraAvailabilityNotBlocked()),
	removeNotVisibleNotifications: () => dispatch(removeNotVisibleNotifications()),
});

export default connect(mapStateToProps, mapDispatchToProps)(Main);
