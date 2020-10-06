import React, { useState, useEffect, useRef, useCallback } from 'react';

import {
	ActivityIndicator,
	AppState,
	StyleSheet,
	View,
	PushNotificationIOS // eslint-disable-line react-native/split-platform-components
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import GlobalAlert from '../../UI/GlobalAlert';
import BackgroundTimer from 'react-native-background-timer';
import Approval from '../../Views/Approval';
import NotificationManager from '../../../core/NotificationManager';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';
import PushNotification from 'react-native-push-notification';
import I18n from '../../../../locales/i18n';
import { colors } from '../../../styles/common';
import LockManager from '../../../core/LockManager';
import FadeOutOverlay from '../../UI/FadeOutOverlay';
import { hexToBN, fromWei, renderFromTokenMinimalUnit } from '../../../util/number';
import { setEtherTransaction, setTransactionObject } from '../../../actions/transaction';
import PersonalSign from '../../UI/PersonalSign';
import TypedSign from '../../UI/TypedSign';
import Modal from 'react-native-modal';
import WalletConnect from '../../../core/WalletConnect';
import Device from '../../../util/Device';
import {
	getMethodData,
	TOKEN_METHOD_TRANSFER,
	decodeTransferData,
	APPROVE_FUNCTION_SIGNATURE
} from '../../../util/transactions';
import { BN } from 'ethereumjs-util';
import { safeToChecksumAddress } from '../../../util/address';
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

	const backgroundMode = useRef(false);
	const locale = useRef(I18n.locale);
	const lockManager = useRef();
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

	const onUnapprovedTransaction = useCallback(
		async transactionMeta => {
			if (transactionMeta.origin === TransactionTypes.MMM) return;
			const {
				transaction: { value, gas, gasPrice, data }
			} = transactionMeta;
			const { AssetsContractController } = Engine.context;
			transactionMeta.transaction.gas = hexToBN(gas);
			transactionMeta.transaction.gasPrice = hexToBN(gasPrice);

			const to = safeToChecksumAddress(transactionMeta.transaction.to);

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
		},
		[props.tokens, setEtherTransaction, setTransactionObject, toggleApproveModal, toggleDappTransactionModal]
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

			removeConnectionStatusListener.current = NetInfo.addEventListener(connectionChangeHandler);
		}, 1000);

		return function cleanup() {
			AppState.removeEventListener('change', handleAppStateChange);
			lockManager.current.stopListening();
			Engine.context.PersonalMessageManager.hub.removeAllListeners();
			Engine.context.TypedMessageManager.hub.removeAllListeners();
			Engine.context.TransactionController.hub.removeListener('unapprovedTransaction', onUnapprovedTransaction);
			WalletConnect.hub.removeAllListeners();
			removeConnectionStatusListener.current && removeConnectionStatusListener.current();
		};
	}, [connectionChangeHandler, handleAppStateChange, onUnapprovedTransaction, pollForIncomingTransactions, props]);

	return (
		<React.Fragment>
			<View style={styles.flex}>
				{!forceReload ? (
					<MainNavigator
						navigation={props.navigation}
						screenProps={{ isPaymentRequest: props.isPaymentRequest }}
					/>
				) : (
					renderLoader()
				)}
				<GlobalAlert />
				<FadeOutOverlay />
				<Notification navigation={props.navigation} />
				<FiatOrders />
				<BackupAlert navigation={props.navigation} />
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
	approveModalVisible: PropTypes.bool
};

const mapStateToProps = state => ({
	lockTime: state.settings.lockTime,
	thirdPartyApiMode: state.privacy.thirdPartyApiMode,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	tokens: state.engine.backgroundState.AssetsController.tokens,
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
