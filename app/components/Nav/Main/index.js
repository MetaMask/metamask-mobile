import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
	ActivityIndicator,
	AppState,
	StyleSheet,
	View,
	Alert,
	InteractionManager,
	PushNotificationIOS // eslint-disable-line react-native/split-platform-components
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ENS from 'ethjs-ens';
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
import { BNToHex, hexToBN, fromWei, renderFromTokenMinimalUnit } from '../../../util/number';
import { setEtherTransaction, setTransactionObject } from '../../../actions/transaction';
import PersonalSign from '../../UI/PersonalSign';
import TypedSign from '../../UI/TypedSign';
import Modal from 'react-native-modal';
import WalletConnect from '../../../core/WalletConnect';
import PaymentChannelsClient from '../../../core/PaymentChannelsClient';
import Networks from '../../../util/networks';
import Device from '../../../util/Device';
import {
	CONNEXT_DEPOSIT,
	getMethodData,
	TOKEN_METHOD_TRANSFER,
	decodeTransferData,
	APPROVE_FUNCTION_SIGNATURE
} from '../../../util/transactions';
import { BN, isValidAddress } from 'ethereumjs-util';
import { isENS, safeToChecksumAddress } from '../../../util/address';
import Logger from '../../../util/Logger';
import contractMap from 'eth-contract-metadata';
import MessageSign from '../../UI/MessageSign';
import Approve from '../../Views/ApproveView/Approve';
import TransactionTypes from '../../../core/TransactionTypes';
import BackupAlert from '../../UI/BackupAlert';
import Notification from '../../UI/Notification';
import FiatOrders from '../../UI/FiatOrders';
import {
	showTransactionNotification,
	hideTransactionNotification,
	showSimpleNotification
} from '../../../actions/notification';
import { toggleDappTransactionModal, toggleApproveModal } from '../../../actions/modals';
import AccountApproval from '../../UI/AccountApproval';
import ProtectYourWalletModal from '../../UI/ProtectYourWalletModal';
import MainNavigator from './MainNavigator';
import PaymentChannelApproval from '../../UI/PaymentChannelApproval';
import SkipAccountSecurityModal from '../../UI/SkipAccountSecurityModal';

const styles = StyleSheet.create({
	flex: {
		flex: 1
	},
	loader: {
		backgroundColor: colors.white,
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	}
});

const Main = props => {
	const [connected, setConnected] = useState(false);
	const [forceReload, setForceReload] = useState(false);
	const [signMessage, setSignMessage] = useState(false);
	const [signMessageParams, setSignMessageParams] = useState({ data: '' });
	const [signType, setSignType] = useState(false);
	const [walletConnectRequest, setWalletConnectRequest] = useState(false);
	const [walletConnectRequestInfo, setWalletConnectRequestInfo] = useState(false);
	const [showExpandedMessage, setShowExpandedMessage] = useState(false);
	const [currentPageTitle, setCurrentPageTitle] = useState('');
	const [currentPageUrl, setCurrentPageUrl] = useState('');

	const [paymentChannelRequest, setPaymentChannelRequest] = useState(false);
	const [paymentChannelRequestLoading, setPaymentChannelRequestLoading] = useState(false);
	const [paymentChannelRequestCompleted, setPaymentChannelRequestCompleted] = useState(false);
	const [paymentChannelRequestInfo, setPaymentChannelRequestInfo] = useState({});
	const [paymentChannelBalance, setPaymentChannelBalance] = useState(null);
	const [paymentChannelReady, setPaymentChannelReady] = useState(false);
	const [showRemindLaterModal, setShowRemindLaterModal] = useState(false);
	const [skipCheckbox, setSkipCheckbox] = useState(false);

	const backgroundMode = useRef(false);
	const locale = useRef(I18n.locale);
	const lockManager = useRef();
	const paymentChannelsEnabled = useRef(props.paymentChannelsEnabled);
	const removeConnectionStatusListener = useRef();

	const setTransactionObject = props.setTransactionObject;
	const toggleApproveModal = props.toggleApproveModal;
	const toggleDappTransactionModal = props.toggleDappTransactionModal;
	const setEtherTransaction = props.setEtherTransaction;

	const usePrevious = value => {
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
		setSignMessage(true);
		setSignMessageParams(messageParams);
		setSignType(type);
		setCurrentPageTitle(currentPageTitle);
		setCurrentPageUrl(currentPageUrl);
	};

	const connectionChangeHandler = useCallback(
		state => {
			// Show the modal once the status changes to offline
			if (connected && !state.isConnected) {
				props.navigation.navigate('OfflineModeView');
			}
			setConnected(state.isConnected);
		},
		[connected, props.navigation]
	);

	const initializeWalletConnect = () => {
		WalletConnect.hub.on('walletconnectSessionRequest', peerInfo => {
			setWalletConnectRequest(true);
			setWalletConnectRequestInfo(peerInfo);
		});
		WalletConnect.init();
	};

	const paymentChannelDepositSign = useCallback(
		async transactionMeta => {
			const { TransactionController } = Engine.context;
			try {
				TransactionController.hub.once(`${transactionMeta.id}:finished`, transactionMeta => {
					if (transactionMeta.status === 'submitted') {
						props.navigation.pop();
						NotificationManager.watchSubmittedTransaction({
							...transactionMeta,
							assetType: transactionMeta.transaction.assetType
						});
					} else {
						throw transactionMeta.error;
					}
				});

				const fullTx = props.transactions.find(({ id }) => id === transactionMeta.id);
				const gasPrice = BNToHex(
					hexToBN(transactionMeta.transaction.gasPrice)
						.mul(new BN(AppConstants.INSTAPAY_GAS_PONDERATOR * 10))
						.div(new BN(10))
				);
				const updatedTx = { ...fullTx, transaction: { ...transactionMeta.transaction, gasPrice } };
				await TransactionController.updateTransaction(updatedTx);
				await TransactionController.approveTransaction(transactionMeta.id);
			} catch (error) {
				Alert.alert(strings('transactions.transaction_error'), error && error.message, [
					{ text: strings('navigation.ok') }
				]);
				Logger.error(error, 'error while trying to send transaction (Main)');
			}
		},
		[props.navigation, props.transactions]
	);

	const onUnapprovedTransaction = useCallback(
		async transactionMeta => {
			if (transactionMeta.origin === TransactionTypes.MMM) return;

			const to = safeToChecksumAddress(transactionMeta.transaction.to);
			const networkId = Networks[props.providerType].networkId;

			if (
				props.paymentChannelsEnabled &&
				AppConstants.CONNEXT.SUPPORTED_NETWORKS.includes(props.providerType) &&
				transactionMeta.transaction.data &&
				transactionMeta.transaction.data.substr(0, 10) === CONNEXT_DEPOSIT &&
				to === AppConstants.CONNEXT.CONTRACTS[networkId]
			) {
				await paymentChannelDepositSign(transactionMeta);
			} else {
				const {
					transaction: { value, gas, gasPrice, data }
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
					let asset = props.tokens.find(({ address }) => address === to);
					if (!asset && contractMap[to]) {
						asset = contractMap[to];
					} else if (!asset) {
						try {
							asset = {};
							asset.decimals = await AssetsContractController.getTokenDecimals(to);
							asset.symbol = await AssetsContractController.getAssetSymbol(to);
						} catch (e) {
							// This could fail when requesting a transfer in other network
							asset = { symbol: 'ERC20', decimals: new BN(0) };
						}
					}

					const decodedData = decodeTransferData('transfer', data);
					transactionMeta.transaction.value = hexToBN(decodedData[2]);
					transactionMeta.transaction.readableValue = renderFromTokenMinimalUnit(
						hexToBN(decodedData[2]),
						asset.decimals
					);
					transactionMeta.transaction.to = decodedData[0];

					setTransactionObject({
						type: 'INDIVIDUAL_TOKEN_TRANSACTION',
						selectedAsset: asset,
						id: transactionMeta.id,
						origin: transactionMeta.origin,
						...transactionMeta.transaction
					});
				} else {
					transactionMeta.transaction.value = hexToBN(value);
					transactionMeta.transaction.readableValue = fromWei(transactionMeta.transaction.value);

					setEtherTransaction({
						id: transactionMeta.id,
						origin: transactionMeta.origin,
						...transactionMeta.transaction
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
			paymentChannelDepositSign,
			props.paymentChannelsEnabled,
			props.providerType,
			props.tokens,
			setEtherTransaction,
			setTransactionObject,
			toggleApproveModal,
			toggleDappTransactionModal
		]
	);

	const handleAppStateChange = useCallback(
		appState => {
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
				BackgroundTimer.runBackgroundTimer(async () => {
					await Engine.refreshTransactionHistory();
				}, AppConstants.TX_CHECK_BACKGROUND_FREQUENCY);
			}
		},
		[backgroundMode, pollForIncomingTransactions]
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
						url: meta && meta.url
					}}
					walletConnectRequest
				/>
			</Modal>
		);
	};

	const renderDappTransactionModal = () =>
		props.dappTransactionModalVisible && (
			<Approval dappTransactionModalVisible toggleDappTransactionModal={props.toggleDappTransactionModal} />
		);

	const renderApproveModal = () =>
		props.approveModalVisible && <Approve modalVisible toggleApproveModal={props.toggleApproveModal} />;

	const initiatePaymentChannelRequest = useCallback(
		({ amount, to }) => {
			setTransactionObject({
				selectedAsset: {
					address: '0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359',
					decimals: 18,
					logo: 'sai.svg',
					symbol: 'SAI',
					assetBalance: paymentChannelBalance
				},
				value: amount,
				readableValue: amount,
				transactionTo: to,
				from: props.selectedAddress,
				transactionFromName: props.identities[props.selectedAddress].name,
				paymentChannelTransaction: true,
				type: 'PAYMENT_CHANNEL_TRANSACTION'
			});

			props.navigation.navigate('Confirm');
		},
		[paymentChannelBalance, props.identities, props.navigation, props.selectedAddress, setTransactionObject]
	);

	const onPaymentChannelStateChange = useCallback(
		state => {
			if (state.balance !== paymentChannelBalance || !paymentChannelReady) {
				setPaymentChannelBalance(state.balance);
				setPaymentChannelReady(true);
			}
		},
		[paymentChannelBalance, paymentChannelReady]
	);

	const initializePaymentChannels = useCallback(() => {
		PaymentChannelsClient.init(props.selectedAddress);
		PaymentChannelsClient.hub.on('state::change', onPaymentChannelStateChange);
		PaymentChannelsClient.hub.on('payment::request', async request => {
			const validRequest = { ...request };
			// Validate amount
			if (isNaN(request.amount)) {
				Alert.alert(
					strings('payment_channel_request.title_error'),
					strings('payment_channel_request.amount_error_message')
				);
				return;
			}

			const isAddress = !request.to || request.to.substring(0, 2).toLowerCase() === '0x';
			const isInvalidAddress = isAddress && !isValidAddress(request.to);

			// Validate address
			if (isInvalidAddress || (!isAddress && !isENS(request.to))) {
				Alert.alert(
					strings('payment_channel_request.title_error'),
					strings('payment_channel_request.address_error_message')
				);
				return;
			}

			// Check if ENS and resolve the address before sending
			if (isENS(request.to)) {
				InteractionManager.runAfterInteractions(async () => {
					const {
						state: { network },
						provider
					} = Engine.context.NetworkController;
					const ensProvider = new ENS({ provider, network });
					try {
						const resolvedAddress = await ensProvider.lookup(request.to.trim());
						if (isValidAddress(resolvedAddress)) {
							validRequest.to = resolvedAddress;
							validRequest.ensName = request.to;
							initiatePaymentChannelRequest(validRequest);
							return;
						}
					} catch (e) {
						Logger.log('Error with payment request', request);
					}
					Alert.alert(
						strings('payment_channel_request.title_error'),
						strings('payment_channel_request.address_error_message')
					);

					setPaymentChannelRequest(false);
					setPaymentChannelRequestInfo(null);
				});
			} else {
				initiatePaymentChannelRequest(validRequest);
			}
		});

		PaymentChannelsClient.hub.on('payment::complete', () => {
			// show the success screen
			setPaymentChannelRequestCompleted(true);
			// hide the modal and reset state
			setTimeout(() => {
				setPaymentChannelRequest(false);
				setPaymentChannelRequestLoading(false);
				setPaymentChannelRequestInfo({});
				setTimeout(() => {
					setPaymentChannelRequestCompleted(false);
				}, 1500);
			}, 800);
		});

		PaymentChannelsClient.hub.on('payment::error', error => {
			if (error === 'INVALID_ENS_NAME') {
				Alert.alert(
					strings('payment_channel_request.title_error'),
					strings('payment_channel_request.address_error_message')
				);
			} else if (error.indexOf('insufficient_balance') !== -1) {
				Alert.alert(
					strings('payment_channel_request.error'),
					strings('payment_channel_request.balance_error_message')
				);
			}

			// hide the modal and reset state
			setTimeout(() => {
				setTimeout(() => {
					setPaymentChannelRequest(false);
					setPaymentChannelRequestLoading(false);
					setPaymentChannelRequestInfo({});
					setTimeout(() => {
						setPaymentChannelRequestCompleted(false);
					});
				}, 800);
			}, 800);
		});
	}, [initiatePaymentChannelRequest, onPaymentChannelStateChange, props.selectedAddress]);

	const onPaymentChannelRequestApproval = () => {
		PaymentChannelsClient.hub.emit('payment::confirm', paymentChannelRequestInfo);
		setPaymentChannelRequestLoading(true);
	};

	const onPaymentChannelRequestRejected = () => {
		setPaymentChannelRequestLoading(false);
		setTimeout(() => setPaymentChannelRequestInfo({}), 1000);
	};

	const renderPaymentChannelRequestApproval = () => (
		<Modal
			isVisible={paymentChannelRequest}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={300}
			animationOutTiming={300}
			onSwipeComplete={onPaymentChannelRequestRejected}
			onBackButtonPress={onPaymentChannelRequestRejected}
			swipeDirection={'down'}
		>
			<PaymentChannelApproval
				onCancel={onPaymentChannelRequestRejected}
				onConfirm={onPaymentChannelRequestApproval}
				info={paymentChannelRequestInfo}
				loading={paymentChannelRequestLoading}
				complete={paymentChannelRequestCompleted}
			/>
		</Modal>
	);

	const toggleRemindLater = () => {
		setShowRemindLaterModal(!showRemindLaterModal);
	};

	const toggleSkipCheckbox = () => {
		setSkipCheckbox(!skipCheckbox);
	};

	const skipAccountModalSecureNow = () => {
		toggleRemindLater();
		props.navigation.navigate('AccountBackupStep1B', { ...props.navigation.state.params });
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
		if (props.paymentChannelsEnabled !== paymentChannelsEnabled.current) {
			paymentChannelsEnabled.current = props.paymentChannelsEnabled;
			if (props.paymentChannelsEnabled) {
				initializePaymentChannels();
			} else {
				PaymentChannelsClient.stop();
			}
		}
	});

	useEffect(() => {
		initializeWalletConnect();
		AppState.addEventListener('change', handleAppStateChange);
		lockManager.current = new LockManager(props.navigation, props.lockTime);
		PushNotification.configure({
			requestPermissions: false,
			onNotification: notification => {
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
			}
		});

		Engine.context.TransactionController.hub.on('unapprovedTransaction', onUnapprovedTransaction);

		Engine.context.MessageManager.hub.on('unapprovedMessage', messageParams =>
			onUnapprovedMessage(messageParams, 'eth')
		);

		Engine.context.PersonalMessageManager.hub.on('unapprovedMessage', messageParams =>
			onUnapprovedMessage(messageParams, 'personal')
		);

		Engine.context.TypedMessageManager.hub.on('unapprovedMessage', messageParams =>
			onUnapprovedMessage(messageParams, 'typed')
		);

		setTimeout(() => {
			NotificationManager.init(
				props.navigation,
				props.showTransactionNotification,
				props.hideTransactionNotification,
				props.showSimpleNotification
			);
			pollForIncomingTransactions();

			// Only if enabled under settings
			if (props.paymentChannelsEnabled) {
				initializePaymentChannels();
			}

			removeConnectionStatusListener.current = NetInfo.addEventListener(connectionChangeHandler);
		}, 1000);

		return function cleanup() {
			AppState.removeEventListener('change', handleAppStateChange);
			lockManager.current.stopListening();
			Engine.context.PersonalMessageManager.hub.removeAllListeners();
			Engine.context.TypedMessageManager.hub.removeAllListeners();
			Engine.context.TransactionController.hub.removeListener('unapprovedTransaction', onUnapprovedTransaction);
			WalletConnect.hub.removeAllListeners();
			PaymentChannelsClient.hub.removeAllListeners();
			PaymentChannelsClient.stop();
			removeConnectionStatusListener.current && removeConnectionStatusListener.current();
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<React.Fragment>
			<View style={styles.flex}>
				{!forceReload ? (
					<MainNavigator
						navigation={props.navigation}
						screenProps={{
							isPaymentChannelTransaction: props.isPaymentChannelTransaction,
							isPaymentRequest: props.isPaymentRequest
						}}
					/>
				) : (
					renderLoader()
				)}
				<GlobalAlert />
				<FadeOutOverlay />
				<Notification navigation={props.navigation} />
				<FiatOrders />
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
			{renderPaymentChannelRequestApproval()}
		</React.Fragment>
	);
};

Main.router = MainNavigator.router;

Main.propTypes = {
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
	hideTransactionNotification: PropTypes.func,
	/**
	 * Indicates whether the current transaction is a deep link transaction
	 */
	isPaymentRequest: PropTypes.bool,
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
	 * Flag that determines if payment channels are enabled
	 */
	paymentChannelsEnabled: PropTypes.bool,
	/**
	 * Selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * List of transactions
	 */
	transactions: PropTypes.array,
	/**
	 * A string representing the network name
	 */
	providerType: PropTypes.string,
	/**
	 * Indicates whether the current transaction is a payment channel transaction
	 */
	isPaymentChannelTransaction: PropTypes.bool,
	/**
	/* Identities object required to get account name
	*/
	identities: PropTypes.object
};

const mapStateToProps = state => ({
	lockTime: state.settings.lockTime,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	paymentChannelsEnabled: state.settings.paymentChannelsEnabled,
	providerType: state.engine.backgroundState.NetworkController.provider.type,
	isPaymentChannelTransaction: state.transaction.paymentChannelTransaction,
	isPaymentRequest: state.transaction.paymentRequest,
	identities: state.engine.backgroundState.PreferencesController.identities,
	dappTransactionModalVisible: state.modals.dappTransactionModalVisible,
	approveModalVisible: state.modals.approveModalVisible
});

const mapDispatchToProps = dispatch => ({
	setEtherTransaction: transaction => dispatch(setEtherTransaction(transaction)),
	setTransactionObject: transaction => dispatch(setTransactionObject(transaction)),
	showTransactionNotification: args => dispatch(showTransactionNotification(args)),
	showSimpleNotification: args => dispatch(showSimpleNotification(args)),
	hideTransactionNotification: () => dispatch(hideTransactionNotification()),
	toggleDappTransactionModal: (show = null) => dispatch(toggleDappTransactionModal(show)),
	toggleApproveModal: show => dispatch(toggleApproveModal(show))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Main);
