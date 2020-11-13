import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Dimensions, InteractionManager } from 'react-native';
import { hideTransactionNotification } from '../../../actions/notification';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TransactionDetails from '../TransactionElement/TransactionDetails';
import decodeTransaction from '../TransactionElement/utils';
import BaseNotification from './BaseNotification';
import Device from '../../../util/Device';
import Animated, { Easing } from 'react-native-reanimated';
import ElevatedView from 'react-native-elevated-view';
import { strings } from '../../../../locales/i18n';
import { CANCEL_RATE, SPEED_UP_RATE } from '@metamask/controllers';
import ActionContent from '../ActionModal/ActionContent';
import TransactionActionContent from '../TransactionActionModal/TransactionActionContent';
import { renderFromWei } from '../../../util/number';
import Engine from '../../../core/Engine';
import notificationTypes from '../../../util/notifications';
import { validateTransactionActionBalance } from '../../../util/transactions';

const { TRANSACTION, SIMPLE } = notificationTypes;

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

const WINDOW_WIDTH = Dimensions.get('window').width;
const ACTION_CANCEL = 'cancel';
const ACTION_SPEEDUP = 'speedup';

/**
 * Wrapper component for a global Notification
 */
class Notification extends PureComponent {
	static propTypes = {
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
		// eslint-disable-next-line react/no-unused-prop-types
		selectedAddress: PropTypes.string,
		/**
		 * Current provider ticker
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		ticker: PropTypes.string,
		/**
		 * ETH to current currency conversion rate
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		conversionRate: PropTypes.number,
		/**
		 * Currency code of the currently-active currency
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		currentCurrency: PropTypes.string,
		/**
		 * Current exchange rate
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		exchangeRate: PropTypes.number,
		/**
		 * Object containing token exchange rates in the format address => exchangeRate
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		contractExchangeRates: PropTypes.object,
		/**
		 * An array that represents the user collectible contracts
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		collectibleContracts: PropTypes.array,
		/**
		 * An array that represents the user tokens
		 */
		// eslint-disable-next-line react/no-unused-prop-types
		tokens: PropTypes.object,
		/**
		 * Transaction status
		 */
		status: PropTypes.string,
		/**
		 * Primary currency, either ETH or Fiat
		 */
		// eslint-disable-next-line react/no-unused-prop-types
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

	state = {
		transactionDetails: undefined,
		transactionElement: undefined,
		tx: {},
		transactionDetailsIsVisible: false,
		internalIsVisible: true,
		inBrowserView: false
	};

	notificationAnimated = new Animated.Value(100);
	detailsYAnimated = new Animated.Value(0);
	actionXAnimated = new Animated.Value(0);
	detailsAnimated = new Animated.Value(0);

	existingGasPriceDecimal = '0x0';

	animatedTimingStart = (animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: Easing.linear,
			useNativeDriver: true
		}).start();
	};

	detailsFadeIn = async () => {
		await this.setState({ transactionDetailsIsVisible: true });
		this.animatedTimingStart(this.detailsAnimated, 1);
	};

	componentDidMount = () => {
		this.props.hideTransactionNotification();
		// To get the notificationAnimated ref when component mounts
		setTimeout(() => this.setState({ internalIsVisible: this.props.isVisible }), 100);
	};

	isInBrowserView = () => {
		const currentRouteName = this.findRouteNameFromNavigatorState(this.props.navigation.state);
		return currentRouteName === BROWSER_ROUTE;
	};

	componentDidUpdate = async prevProps => {
		// Check whether current view is browser
		if (this.props.isVisible && prevProps.navigation.state !== this.props.navigation.state) {
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ inBrowserView: this.isInBrowserView(prevProps) });
		}
		if (!prevProps.isVisible && this.props.isVisible) {
			// Auto dismiss notification in case of confirmations
			this.props.autodismiss &&
				setTimeout(() => {
					this.props.hideTransactionNotification();
				}, this.props.autodismiss);

			let tx, transactionElement, transactionDetails;
			if (this.props.notificationType === TRANSACTION) {
				const { paymentChannelTransaction } = this.props.transaction;
				tx = paymentChannelTransaction
					? { paymentChannelTransaction, transaction: {} }
					: this.props.transactions.find(({ id }) => id === this.props.transaction.id);
				// THIS NEEDS REFACTOR
				if (tx) {
					const decoded = await decodeTransaction({ ...this.props, tx });
					transactionElement = decoded[0];
					transactionDetails = decoded[1];
					const existingGasPrice = tx.transaction ? tx.transaction.gasPrice : '0x0';
					this.existingGasPriceDecimal = parseInt(
						existingGasPrice === undefined ? '0x0' : existingGasPrice,
						16
					);
				}
			}
			// eslint-disable-next-line react/no-did-update-set-state
			await this.setState({
				tx,
				transactionElement,
				transactionDetails,
				internalIsVisible: true,
				transactionDetailsIsVisible: false,
				inBrowserView: this.isInBrowserView(prevProps)
			});

			setTimeout(() => this.animatedTimingStart(this.notificationAnimated, 0), 100);
		} else if (prevProps.isVisible && !this.props.isVisible) {
			this.animatedTimingStart(this.notificationAnimated, 200);
			this.animatedTimingStart(this.detailsAnimated, 0);
			// eslint-disable-next-line react/no-did-update-set-state
			setTimeout(
				() =>
					this.setState({
						internalIsVisible: false,
						tx: undefined,
						transactionElement: undefined,
						transactionDetails: undefined
					}),
				500
			);
		}
	};

	findRouteNameFromNavigatorState({ routes }) {
		let route = routes[routes.length - 1];
		while (route.index !== undefined) route = route.routes[route.index];
		return route.routeName;
	}

	componentWillUnmount = () => {
		this.props.hideTransactionNotification();
	};

	onClose = () => {
		this.onCloseDetails();
		this.props.hideTransactionNotification();
	};

	onCloseDetails = () => {
		this.animatedTimingStart(this.detailsAnimated, 0);
		setTimeout(() => this.setState({ transactionDetailsIsVisible: false }), 1000);
	};

	onPress = () => {
		this.setState({ transactionDetailsIsVisible: true });
	};

	onNotificationPress = () => {
		const {
			tx: { paymentChannelTransaction }
		} = this.state;
		if (paymentChannelTransaction) {
			this.props.navigation.navigate('PaymentChannelHome');
		} else {
			this.detailsFadeIn();
		}
	};

	onSpeedUpPress = () => {
		const transactionActionDisabled = validateTransactionActionBalance(
			this.state.tx,
			SPEED_UP_RATE,
			this.props.accounts
		);
		this.setState({ transactionAction: ACTION_SPEEDUP, transactionActionDisabled });
		this.animateActionTo(-WINDOW_WIDTH);
	};

	onCancelPress = () => {
		const transactionActionDisabled = validateTransactionActionBalance(
			this.state.tx,
			CANCEL_RATE,
			this.props.accounts
		);
		this.setState({ transactionAction: ACTION_CANCEL, transactionActionDisabled });
		this.animateActionTo(-WINDOW_WIDTH);
	};

	onActionFinish = () => this.animateActionTo(0);

	animateActionTo = position => {
		this.animatedTimingStart(this.detailsYAnimated, position);
		this.animatedTimingStart(this.actionXAnimated, position);
	};

	speedUpTransaction = () => {
		InteractionManager.runAfterInteractions(() => {
			try {
				Engine.context.TransactionController.speedUpTransaction(this.state.tx.id);
			} catch (e) {
				// ignore because transaction already went through
			}
			this.onActionFinish();
		});
	};

	cancelTransaction = () => {
		InteractionManager.runAfterInteractions(() => {
			try {
				Engine.context.TransactionController.stopTransaction(this.state.tx.id);
			} catch (e) {
				// ignore because transaction already went through
			}
			this.onActionFinish();
		});
	};

	notificationOverlay = () => {
		const { navigation } = this.props;
		const {
			transactionElement,
			transactionDetails,
			tx,
			inBrowserView,
			transactionAction,
			transactionActionDisabled
		} = this.state;
		const isActionCancel = transactionAction === ACTION_CANCEL;
		return (
			<View style={styles.detailsContainer}>
				<Animated.View
					style={[
						styles.modalView,
						{ opacity: this.detailsAnimated },
						inBrowserView ? styles.modalViewInBrowserView : {},
						{ transform: [{ translateX: this.detailsYAnimated }] }
					]}
				>
					<View style={styles.modalContainer}>
						<View style={styles.titleWrapper}>
							<Text style={styles.title} onPress={this.onCloseDetails}>
								{transactionElement.actionKey}
							</Text>
							<Ionicons
								onPress={this.onCloseDetails}
								name={'ios-close'}
								size={38}
								style={styles.closeIcon}
							/>
						</View>
						<TransactionDetails
							transactionObject={tx}
							transactionDetails={transactionDetails}
							navigation={navigation}
							close={this.onClose}
							showSpeedUpModal={this.onSpeedUpPress}
							showCancelModal={this.onCancelPress}
						/>
					</View>
				</Animated.View>

				<Animated.View
					style={[
						styles.modalView,
						{ opacity: this.detailsAnimated },
						inBrowserView ? styles.modalViewInBrowserView : {},
						{ transform: [{ translateX: this.actionXAnimated }] }
					]}
				>
					<View style={styles.transactionAction}>
						<ActionContent
							onCancelPress={this.onActionFinish}
							onConfirmPress={isActionCancel ? this.cancelTransaction : this.speedUpTransaction}
							confirmText={strings('transaction.lets_try')}
							confirmButtonMode={'confirm'}
							cancelText={strings('transaction.nevermind')}
							confirmDisabled={transactionActionDisabled}
						>
							<TransactionActionContent
								confirmDisabled={transactionActionDisabled}
								feeText={`${renderFromWei(
									Math.floor(
										this.existingGasPriceDecimal * isActionCancel ? CANCEL_RATE : SPEED_UP_RATE
									)
								)} ${strings('unit.eth')}`}
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

	handleTransactionNotification = () => {
		const { status } = this.props;
		const { tx, transactionDetailsIsVisible, inBrowserView } = this.state;
		const isPaymentChannelTransaction = tx && tx.paymentChannelTransaction;
		const data = tx ? { ...tx.transaction, ...this.props.transaction } : { ...this.props.transaction };
		return (
			<ElevatedView
				style={[
					styles.modalTypeView,
					inBrowserView ? styles.modalTypeViewBrowser : {},
					transactionDetailsIsVisible && !isPaymentChannelTransaction
						? styles.modalTypeViewDetailsVisible
						: {}
				]}
				elevation={100}
			>
				{transactionDetailsIsVisible && !isPaymentChannelTransaction && this.notificationOverlay()}
				<Animated.View
					style={[styles.notificationContainer, { transform: [{ translateY: this.notificationAnimated }] }]}
				>
					<BaseNotification
						status={status}
						data={data}
						onPress={this.onNotificationPress}
						onHide={this.onClose}
					/>
				</Animated.View>
			</ElevatedView>
		);
	};

	handleSimpleNotification = () => {
		const { inBrowserView } = this.state;
		const { notificationTitle, notificationDescription, notificationStatus } = this.props;
		return (
			<ElevatedView
				style={[styles.modalTypeView, inBrowserView ? styles.modalTypeViewBrowser : {}]}
				elevation={100}
			>
				<Animated.View
					style={[styles.notificationContainer, { transform: [{ translateY: this.notificationAnimated }] }]}
				>
					<BaseNotification
						status={notificationStatus}
						data={{ title: notificationTitle, description: notificationDescription }}
						onHide={this.onClose}
					/>
				</Animated.View>
			</ElevatedView>
		);
	};

	render = () => {
		if (!this.state.internalIsVisible) return null;
		if (this.props.notificationType === TRANSACTION) return this.handleTransactionNotification();
		if (this.props.notificationType === SIMPLE) return this.handleSimpleNotification();
		return null;
	};
}

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
