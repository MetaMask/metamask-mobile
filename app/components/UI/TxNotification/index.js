import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text } from 'react-native';
import { hideTransactionNotification } from '../../../actions/transactionNotification';
import { connect } from 'react-redux';
import { colors, fontStyles } from '../../../styles/common';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TransactionDetails from '../TransactionElement/TransactionDetails';
import decodeTransaction from '../TransactionElement/utils';
import TransactionNotification from '../TransactionNotification';
import Device from '../../../util/Device';
import Animated, { Easing } from 'react-native-reanimated';
import ElevatedView from 'react-native-elevated-view';

const BROWSER_ROUTE = 'BrowserView';

const styles = StyleSheet.create({
	modalView: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.greytransparent,
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
		bottom: Device.isIphoneX() ? 20 : 10,
		left: 0,
		right: 0,
		zIndex: 101,
		backgroundColor: colors.transparent
	},
	modalTypeViewBrowser: {
		bottom: Device.isIphoneX() ? 90 : 70
	},
	transactionDetailsVisible: {
		top: 0
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
	notificationWrapper: {
		height: 70,
		width: '100%'
	}
});

/**
 * Wrapper component for a global alert
 * connected to redux
 */
class TxNotification extends PureComponent {
	static propTypes = {
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
		primaryCurrency: PropTypes.string
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
	detailsAnimated = new Animated.Value(0);

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
		// To get the notificationAnimated ref when component mounts
		setTimeout(() => this.setState({ internalIsVisible: this.props.isVisible }), 100);
	};

	componentDidUpdate = async prevProps => {
		// Check whether current view is browser
		if (this.props.isVisible && prevProps.navigation.state !== this.props.navigation.state) {
			let inBrowserView = this.state.inBrowserView;
			const currentRouteName = this.findRouteNameFromNavigatorState(this.props.navigation.state);
			if (this.findRouteNameFromNavigatorState(prevProps.navigation.state) !== currentRouteName) {
				inBrowserView = currentRouteName === BROWSER_ROUTE;
			}
			// eslint-disable-next-line react/no-did-update-set-state
			this.setState({ inBrowserView });
		}
		if (!prevProps.isVisible && this.props.isVisible) {
			// Auto dismiss notification in case of confirmations
			this.props.autodismiss &&
				setTimeout(() => {
					this.props.hideTransactionNotification();
				}, this.props.autodismiss);
			// Find new transaction and parse its data
			const tx = this.props.transactions.find(({ id }) => id === this.props.transaction.id);
			const [transactionElement, transactionDetails] = await decodeTransaction({ ...this.props, tx });
			// eslint-disable-next-line react/no-did-update-set-state
			await this.setState({
				tx,
				transactionElement,
				transactionDetails,
				internalIsVisible: true,
				transactionDetailsIsVisible: false
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

	render = () => {
		const { navigation, status } = this.props;
		const {
			transactionElement,
			transactionDetails,
			tx,
			transactionDetailsIsVisible,
			internalIsVisible,
			inBrowserView
		} = this.state;

		if (!internalIsVisible) return null;

		return (
			<ElevatedView
				elevation={100}
				style={[
					styles.modalTypeView,
					transactionDetailsIsVisible ? styles.transactionDetailsVisible : {},
					inBrowserView ? styles.modalTypeViewBrowser : {}
				]}
			>
				{transactionDetailsIsVisible && (
					<Animated.View style={[styles.modalView, { opacity: this.detailsAnimated }]}>
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
							/>
						</View>
					</Animated.View>
				)}
				<Animated.View
					style={[styles.notificationContainer, { transform: [{ translateY: this.notificationAnimated }] }]}
				>
					<View style={styles.notificationWrapper}>
						<TransactionNotification
							status={status}
							transaction={{ ...tx.transaction, ...this.props.transaction }}
							onPress={this.detailsFadeIn}
							onHide={this.onClose}
						/>
					</View>
				</Animated.View>
			</ElevatedView>
		);
	};
}

const mapStateToProps = state => ({
	isVisible: state.transactionNotification.isVisible,
	autodismiss: state.transactionNotification.autodismiss,
	transaction: state.transactionNotification.transaction,
	status: state.transactionNotification.status,
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
)(TxNotification);
