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

const styles = StyleSheet.create({
	modalView: {
		flex: 1,
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: colors.greytransparent,
		paddingBottom: 100,
		marginBottom: -200
	},
	modalContainer: {
		width: '90%',
		backgroundColor: colors.white,
		borderRadius: 10
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
		left: 0,
		right: 0
	},
	modalTypeVisible: {
		zIndex: 100
	},
	modalTypeNotVisible: {
		zIndex: -100
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
		width: '100%',
		marginBottom: Device.isIphoneX() ? 20 : 10
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
		transactionId: PropTypes.string,
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
		status: PropTypes.string
	};

	state = {
		transactionDetails: undefined,
		transactionElement: undefined,
		tx: undefined,
		transactionDetailsIsVisible: false,
		internalIsVisible: this.props.isVisible
	};

	notificationAnimated = new Animated.Value(100);
	detailsAnimated = new Animated.Value(0);

	animatedTimingStart = (animatedRef, toValue) => {
		Animated.timing(animatedRef, {
			toValue,
			duration: 500,
			easing: Easing.linear
		}).start();
	};

	deatilsFadeIn = async () => {
		await this.setState({ transactionDetailsIsVisible: true });
		this.animatedTimingStart(this.detailsAnimated, 1);
	};

	componentDidUpdate = async prevProps => {
		if (!prevProps.isVisible && this.props.isVisible) {
			this.props.autodismiss &&
				setTimeout(() => {
					this.props.hideTransactionNotification();
				}, this.props.autodismiss);
			const { transactions } = this.props;
			const tx = transactions.find(({ id }) => id === this.props.transactionId);
			console.log('from txnotification TX', tx);
			const [transactionElement, transactionDetails] = await decodeTransaction({ ...this.props, tx });
			// eslint-disable-next-line react/no-did-update-set-state
			await this.setState({ tx, transactionElement, transactionDetails, internalIsVisible: true });
			this.animatedTimingStart(this.notificationAnimated, 0);
		} else if (prevProps.isVisible && !this.props.isVisible) {
			this.animatedTimingStart(this.notificationAnimated, 100);
			this.animatedTimingStart(this.detailsAnimated, 0);
			// eslint-disable-next-line react/no-did-update-set-state
			setTimeout(() => this.setState({ internalIsVisible: false }), 1000);
		}
	};

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
			internalIsVisible
		} = this.state;

		console.log('from txnotification status, tx', status, tx);
		if (!transactionElement || !transactionDetails) return <View />;
		return (
			<View
				style={[
					styles.modalTypeView,
					!internalIsVisible ? styles.modalTypeNotVisible : styles.modalTypeVisible,
					transactionDetailsIsVisible ? styles.transactionDetailsVisible : {}
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
							transaction={tx.transaction}
							onPress={this.deatilsFadeIn}
							onHide={this.onClose}
						/>
					</View>
				</Animated.View>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	isVisible: state.transactionNotification.isVisible,
	autodismiss: state.transactionNotification.autodismiss,
	transactionId: state.transactionNotification.transactionId,
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
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency
});

const mapDispatchToProps = dispatch => ({
	hideTransactionNotification: () => dispatch(hideTransactionNotification())
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(TxNotification);
