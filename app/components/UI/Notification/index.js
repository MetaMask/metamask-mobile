import React, { useEffect, useState, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, Dimensions, InteractionManager } from 'react-native';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import Animated, { Easing } from 'react-native-reanimated';
import { strings } from '../../../../locales/i18n';
import { hideTransactionNotification } from '../../../actions/notification';
import Engine from '../../../core/Engine';
import { renderFromWei } from '../../../util/number';
import { validateTransactionActionBalance } from '../../../util/transactions';
import { colors, fontStyles } from '../../../styles/common';
import decodeTransaction from '../TransactionElement/utils';
import notificationTypes from '../../../util/notifications';
import TransactionActionContent from '../TransactionActionModal/TransactionActionContent';
import ActionContent from '../ActionModal/ActionContent';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TransactionDetails from '../TransactionElement/TransactionDetails';
import BaseNotification from './BaseNotification';
import Device from '../../../util/Device';
import ElevatedView from 'react-native-elevated-view';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/controllers';
import BigNumber from 'bignumber.js';

const { TRANSACTION, SIMPLE } = notificationTypes;

const WINDOW_WIDTH = Dimensions.get('window').width;
const ACTION_CANCEL = 'cancel';
const ACTION_SPEEDUP = 'speedup';
const BROWSER_ROUTE = 'BrowserView';

const styles = StyleSheet.create({
	modalView: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		paddingBottom: 200,
		marginBottom: -300
	},
	modalContainer: {
		width: '90%',
		borderRadius: 10,
		backgroundColor: colors.white
	},
	titleWrapper: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderColor: colors.grey100,
		flexDirection: 'row'
	},
	title: {
		flex: 1,
		textAlign: 'center',
		fontSize: 18,
		marginVertical: 12,
		marginHorizontal: 24,
		color: colors.fontPrimary,
		...fontStyles.bold
	},
	modalTypeView: {
		position: 'absolute',
		bottom: 0,
		paddingBottom: Device.isIphoneX() ? 20 : 10,
		left: 0,
		right: 0,
		backgroundColor: colors.transparent
	},
	modalViewInBrowserView: {
		paddingBottom: Device.isIos() ? 130 : 120
	},
	modalTypeViewDetailsVisible: {
		height: '100%',
		backgroundColor: colors.greytransparent
	},
	modalTypeViewBrowser: {
		bottom: Device.isIphoneX() ? 70 : 60
	},
	closeIcon: {
		paddingTop: 4,
		position: 'absolute',
		right: 16
	},
	notificationContainer: {
		flex: 0.1,
		flexDirection: 'row',
		alignItems: 'flex-end'
	},
	detailsContainer: {
		flex: 1,
		width: '200%',
		flexDirection: 'row'
	},
	transactionAction: {
		width: '100%'
	}
});

function Notification(props) {
	const {
		autodismiss,
		isVisible,
		navigation,
		hideTransactionNotification,
		accounts,
		status,
		transaction,
		notificationTitle,
		notificationDescription,
		notificationStatus,
		notificationType,
		transactions
	} = props;

	const [transactionDetails, setTransactionDetails] = useState(undefined);
	const [transactionElement, setTransactionElement] = useState(undefined);
	const [tx, setTx] = useState({});
	const [transactionDetailsIsVisible, setTransactionDetailsIsVisible] = useState(false);
	const [internalIsVisible, setInternalIsVisible] = useState(isVisible);
	const [transactionAction, setTransactionAction] = useState(undefined);
	const [transactionActionDisabled, setTransactionActionDisabled] = useState(false);

	const notificationAnimated = useRef(new Animated.Value(100)).current;
	const detailsYAnimated = useRef(new Animated.Value(0)).current;
	const actionXAnimated = useRef(new Animated.Value(0)).current;
	const detailsAnimated = useRef(new Animated.Value(0)).current;

	const usePrevious = value => {
		const ref = useRef();
		useEffect(() => {
			ref.current = value;
		});
		return ref.current;
	};

	const prevIsVisible = usePrevious(isVisible);
	const prevNavigationState = usePrevious(navigation.state);

	const animatedTimingStart = (animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	};

	const detailsFadeIn = async () => {
		setTransactionDetailsIsVisible(true);
		animatedTimingStart(detailsAnimated, 1);
	};

	const isInBrowserView = useMemo(() => {
		const routes = navigation.state.routes;
		let route = routes[routes.length - 1];
		while (route.index !== undefined) route = route.routes[route.index];
		return route.routeName === BROWSER_ROUTE;
	}, [navigation.state]);

	const animateActionTo = position => {
		animatedTimingStart(detailsYAnimated, position);
		animatedTimingStart(actionXAnimated, position);
	};

	const onCloseDetails = () => {
		animatedTimingStart(detailsAnimated, 0);
		setTimeout(() => setTransactionDetailsIsVisible(false), 1000);
	};

	const onClose = () => {
		onCloseDetails();
		hideTransactionNotification();
	};

	const onSpeedUpPress = () => {
		const transactionActionDisabled = validateTransactionActionBalance(tx, SPEED_UP_RATE, accounts);
		setTransactionAction(ACTION_SPEEDUP);
		setTransactionActionDisabled(transactionActionDisabled);
		animateActionTo(-WINDOW_WIDTH);
	};

	const onCancelPress = () => {
		const transactionActionDisabled = validateTransactionActionBalance(tx, CANCEL_RATE, accounts);
		setTransactionAction(ACTION_CANCEL);
		setTransactionActionDisabled(transactionActionDisabled);
		animateActionTo(-WINDOW_WIDTH);
	};

	const onActionFinish = () => animateActionTo(0);

	const speedUpTransaction = () => {
		InteractionManager.runAfterInteractions(() => {
			try {
				Engine.context.TransactionController.speedUpTransaction(tx?.id);
			} catch (e) {
				// ignore because transaction already went through
			}
			onActionFinish();
		});
	};

	const cancelTransaction = () => {
		InteractionManager.runAfterInteractions(() => {
			try {
				Engine.context.TransactionController.stopTransaction(tx?.id);
			} catch (e) {
				// ignore because transaction already went through
			}
			onActionFinish();
		});
	};

	const renderTransactionDetails = () => {
		const existingGasPrice = new BigNumber(tx?.transaction?.gasPrice || '0x0');
		const gasFee = existingGasPrice
			.times(transactionAction === ACTION_CANCEL ? CANCEL_RATE : SPEED_UP_RATE)
			.toString();
		return (
			<View style={styles.detailsContainer}>
				<Animated.View
					style={[
						styles.modalView,
						{ opacity: detailsAnimated },
						isInBrowserView && styles.modalViewInBrowserView,
						{ transform: [{ translateX: detailsYAnimated }] }
					]}
				>
					<View style={styles.modalContainer}>
						<View style={styles.titleWrapper}>
							<Text style={styles.title} onPress={onCloseDetails}>
								{transactionElement.actionKey}
							</Text>
							<Ionicons onPress={onCloseDetails} name={'ios-close'} size={38} style={styles.closeIcon} />
						</View>
						<TransactionDetails
							transactionObject={tx}
							transactionDetails={transactionDetails}
							navigation={navigation}
							close={onClose}
							showSpeedUpModal={onSpeedUpPress}
							showCancelModal={onCancelPress}
						/>
					</View>
				</Animated.View>

				<Animated.View
					style={[
						styles.modalView,
						{ opacity: detailsAnimated },
						isInBrowserView && styles.modalViewInBrowserView,
						{ transform: [{ translateX: actionXAnimated }] }
					]}
				>
					<View style={styles.transactionAction}>
						<ActionContent
							onCancelPress={onActionFinish}
							onConfirmPress={
								transactionAction === ACTION_CANCEL ? cancelTransaction : speedUpTransaction
							}
							confirmText={strings('transaction.lets_try')}
							confirmButtonMode={'confirm'}
							cancelText={strings('transaction.nevermind')}
							confirmDisabled={transactionActionDisabled}
						>
							<TransactionActionContent
								confirmDisabled={transactionActionDisabled}
								feeText={`${renderFromWei(gasFee)} ${strings('unit.eth')}`}
								titleText={strings(`transaction.${transactionAction}_tx_title`)}
								gasTitleText={strings(`transaction.gas_${transactionAction}_fee`)}
								descriptionText={strings(`transaction.${transactionAction}_tx_message`)}
							/>
						</ActionContent>
					</View>
				</Animated.View>
			</View>
		);
	};

	const handleTransactionNotification = () => (
		<ElevatedView
			style={[
				styles.modalTypeView,
				isInBrowserView && styles.modalTypeViewBrowser,
				transactionDetailsIsVisible && styles.modalTypeViewDetailsVisible
			]}
			elevation={100}
		>
			{transactionDetailsIsVisible && renderTransactionDetails()}
			<Animated.View
				style={[styles.notificationContainer, { transform: [{ translateY: notificationAnimated }] }]}
			>
				<BaseNotification
					status={status}
					data={tx ? { ...tx.transaction, ...transaction } : { ...transaction }}
					onPress={detailsFadeIn}
					onHide={onClose}
				/>
			</Animated.View>
		</ElevatedView>
	);

	const handleSimpleNotification = () => (
		<ElevatedView style={[styles.modalTypeView, isInBrowserView && styles.modalTypeViewBrowser]} elevation={100}>
			<Animated.View
				style={[styles.notificationContainer, { transform: [{ translateY: notificationAnimated }] }]}
			>
				<BaseNotification
					status={notificationStatus}
					data={{ title: notificationTitle, description: notificationDescription }}
					onHide={onClose}
				/>
			</Animated.View>
		</ElevatedView>
	);

	useEffect(() => {
		hideTransactionNotification();
	}, [hideTransactionNotification]);

	useEffect(() => {
		async function getTransactionInfo() {
			if (internalIsVisible && notificationType === TRANSACTION) {
				const tx = transactions.find(({ id }) => id === transaction.id);
				if (tx) return;
				const [transactionElement, transactionDetails] = await decodeTransaction({ ...props, tx });
				setTx(tx);
				setTransactionElement(transactionElement);
				setTransactionDetails(transactionDetails);
			}
		}
		getTransactionInfo();
	}, [notificationType, internalIsVisible, transactions, transaction, props]);

	useEffect(() => {
		if (!prevIsVisible && isVisible) {
			// Auto dismiss notification in case of confirmations
			autodismiss &&
				setTimeout(() => {
					hideTransactionNotification();
				}, autodismiss);
			setInternalIsVisible(true);
			setTransactionDetailsIsVisible(false);
			setTimeout(() => animatedTimingStart(notificationAnimated, 0), 100);
		} else if (prevIsVisible && !isVisible) {
			animatedTimingStart(notificationAnimated, 200);
			animatedTimingStart(detailsAnimated, 0);
			setTimeout(() => {
				setInternalIsVisible(false);
				setTx(undefined);
				setTransactionElement(undefined);
				setTransactionDetails(undefined);
			}, 500);
		}
	}, [
		isVisible,
		prevIsVisible,
		navigation.state,
		prevNavigationState,
		autodismiss,
		detailsAnimated,
		hideTransactionNotification,
		notificationAnimated
	]);

	if (!internalIsVisible) return null;
	if (notificationType === TRANSACTION) return handleTransactionNotification();
	if (notificationType === SIMPLE) return handleSimpleNotification();
	return null;
}

Notification.propTypes = {
	/**
	 * Map of accounts to information objects including balances
	 */
	accounts: PropTypes.object,
	/**
    /* navigation object required to push new views
    */
	navigation: PropTypes.object,
	/**
	 * Boolean that determines if the modal should be shown
	 */
	isVisible: PropTypes.bool.isRequired,
	/**
	 * Number that determines when it should be autodismissed (in miliseconds)
	 */
	autodismiss: PropTypes.number,
	/**
	 * function that dismisses de modal
	 */
	hideTransactionNotification: PropTypes.func,
	/**
	 * An array that represents the user transactions on chain
	 */
	transactions: PropTypes.array,
	/**
	 * Corresponding transaction can contain id, nonce and amount
	 */
	transaction: PropTypes.object,
	/**
	 * String of selected address
	 */
	selectedAddress: PropTypes.string,
	/**
	 * Current provider ticker
	 */
	ticker: PropTypes.string,
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	/**
	 * Current exchange rate
	 */
	exchangeRate: PropTypes.number,
	/**
	 * Object containing token exchange rates in the format address => exchangeRate
	 */
	contractExchangeRates: PropTypes.object,
	/**
	 * An array that represents the user collectible contracts
	 */
	collectibleContracts: PropTypes.array,
	/**
	 * An array that represents the user tokens
	 */
	tokens: PropTypes.object,
	/**
	 * Transaction status
	 */
	status: PropTypes.string,
	/**
	 * Primary currency, either ETH or Fiat
	 */
	primaryCurrency: PropTypes.string,
	/**
	 * Title for notification if defined
	 */
	notificationTitle: PropTypes.string,
	/**
	 * Description for notification if defined
	 */
	notificationDescription: PropTypes.string,
	/**
	 * Status for notification if defined
	 */
	notificationStatus: PropTypes.string,
	/**
	 * Type of notification, transaction or simple
	 */
	notificationType: PropTypes.string
};

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	isVisible: state.notification.isVisible,
	autodismiss: state.notification.autodismiss,
	transaction: state.notification.transaction,
	notificationTitle: state.notification.title,
	notificationStatus: state.notification.status,
	notificationDescription: state.notification.description,
	notificationType: state.notification.type,
	status: state.notification.status,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	transactions: state.engine.backgroundState.TransactionController.transactions,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	tokens: state.engine.backgroundState.AssetsController.tokens.reduce((tokens, token) => {
		tokens[token.address] = token;
		return tokens;
	}, {}),
	collectibleContracts: state.engine.backgroundState.AssetsController.collectibleContracts,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	primaryCurrency: state.settings.primaryCurrency
});

const mapDispatchToProps = dispatch => ({
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Notification);
