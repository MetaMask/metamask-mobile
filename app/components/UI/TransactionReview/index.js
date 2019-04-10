import React, { Component } from 'react';
import ActionView from '../ActionView';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, PixelRatio } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { getTransactionReviewActionKey } from '../../../util/transactions';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import TransactionReviewInformation from './TransactionReviewInformation';
import TransactionReviewData from './TransactionReviewData';
import TransactionReviewSummary from './TransactionReviewSummary';
import { renderAccountName } from '../../../util/address';

const FONT_SIZE = PixelRatio.get() < 2 ? 12 : 16;
const styles = StyleSheet.create({
	root: {
		backgroundColor: colors.white,
		flex: 1
	},
	graphic: {
		borderBottomWidth: 1,
		borderColor: colors.inputBorderColor,
		borderTopWidth: 1,
		flexDirection: 'row',
		flexGrow: 0,
		flexShrink: 0
	},
	addressText: {
		...fontStyles.bold,
		fontSize: FONT_SIZE,
		marginLeft: 9
	},
	arrow: {
		backgroundColor: colors.white,
		borderColor: colors.lightGray,
		borderRadius: 15,
		borderWidth: 1,
		height: 30,
		width: 30,
		marginTop: -15,
		marginLeft: -15,
		left: '50%',
		position: 'absolute',
		zIndex: 1,
		alignSelf: 'center'
	},
	arrowIcon: {
		color: colors.gray,
		marginLeft: 3,
		marginTop: 3
	},
	addressGraphic: {
		alignItems: 'center',
		flexDirection: 'row',
		minHeight: 42,
		width: '50%',
		flex: 1
	},
	fromGraphic: {
		borderColor: colors.inputBorderColor,
		borderRightWidth: 1,
		paddingRight: 35,
		paddingLeft: 20
	},
	toGraphic: {
		paddingRight: 20,
		paddingLeft: 35
	},
	reviewForm: {
		flex: 1
	},
	overview: {
		flex: 1
	},
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.primary
	},
	tabStyle: {
		paddingBottom: 0,
		backgroundColor: colors.beige
	},
	textStyle: {
		fontSize: 12,
		letterSpacing: 0.5,
		...fontStyles.bold
	},
	error: {
		backgroundColor: colors.lightRed,
		color: colors.error,
		marginTop: 5,
		paddingVertical: 8,
		paddingHorizontal: 5,
		textAlign: 'center',
		fontSize: 12,
		letterSpacing: 0.5,
		marginHorizontal: 14,
		...fontStyles.normal
	},
	ensRecipientContainer: {
		flex: 1,
		marginLeft: 9
	},
	ensRecipient: { ...fontStyles.bold, fontSize: FONT_SIZE },
	ensAddress: { ...fontStyles.normal, fontSize: 10 },
	addressWrapper: { flex: 1 }
});

/**
 * Component that supports reviewing a transaction
 */
class TransactionReview extends Component {
	static propTypes = {
		/**
		/* Identities object required to get account name
		*/
		identities: PropTypes.object,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onCancel: PropTypes.func,
		/**
		 * Called when a user changes modes
		 */
		onModeChange: PropTypes.func,
		/**
		 * Callback triggered when this transaction is cancelled
		 */
		onConfirm: PropTypes.func,
		/**
		 * Indicates whether hex data should be shown in transaction editor
		 */
		showHexData: PropTypes.bool,
		/**
		 * Whether the transaction was confirmed or not
		 */
		transactionConfirmed: PropTypes.bool,
		/**
		 * Transaction object associated with this transaction
		 */
		transaction: PropTypes.object,
		/**
		 * Callback to validate transaction in parent state
		 */
		validate: PropTypes.func
	};

	state = {
		toFocused: false,
		actionKey: strings('transactions.tx_review_confirm'),
		showHexData: false,
		error: undefined
	};

	componentDidMount = async () => {
		const {
			validate,
			transaction,
			transaction: { data }
		} = this.props;
		let { showHexData } = this.props;
		showHexData = showHexData || data;
		const error = validate && (await validate());
		const actionKey = await getTransactionReviewActionKey(transaction);
		this.setState({ error, actionKey, showHexData });
	};

	edit = () => {
		const { onModeChange } = this.props;
		onModeChange && onModeChange('edit');
	};

	renderToAddressDirection = () => {
		const {
			transaction: { to, ensRecipient },
			identities
		} = this.props;
		let child = (
			<Text style={[styles.addressText, styles.addressWrapper]} numberOfLines={1}>
				{renderAccountName(to, identities)}
			</Text>
		);
		if (ensRecipient) {
			child = (
				<View style={styles.ensRecipientContainer}>
					<Text style={styles.ensRecipient} numberOfLines={1}>
						{ensRecipient}
					</Text>
					<Text style={styles.ensAddress} numberOfLines={1}>
						{renderAccountName(to, identities)}
					</Text>
				</View>
			);
		}
		return child;
	};

	renderTransactionDirection = () => {
		const {
			transaction: { from, to },
			identities
		} = this.props;
		return (
			<View style={styles.graphic}>
				<View style={[styles.addressGraphic, styles.fromGraphic]}>
					<Identicon address={from} diameter={18} />
					<Text style={styles.addressText} numberOfLines={1}>
						{renderAccountName(from, identities)}
					</Text>
				</View>
				<View style={styles.arrow}>
					<MaterialIcon name={'arrow-forward'} size={22} style={styles.arrowIcon} />
				</View>
				<View style={[styles.addressGraphic, styles.toGraphic]}>
					<Identicon address={to} diameter={18} />
					{this.renderToAddressDirection()}
				</View>
			</View>
		);
	};

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.primary}
				inactiveTextColor={colors.fontTertiary}
				backgroundColor={colors.white}
				tabStyle={styles.tabStyle}
				textStyle={styles.textStyle}
			/>
		);
	}

	renderTransactionDetails = () => {
		const { showHexData, actionKey } = this.state;
		const { transaction } = this.props;
		return (
			<View style={styles.overview}>
				{showHexData && transaction.data ? (
					<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
						<TransactionReviewInformation
							edit={this.edit}
							tabLabel={strings('transaction.review_details')}
						/>
						<TransactionReviewData actionKey={actionKey} tabLabel={strings('transaction.review_data')} />
					</ScrollableTabView>
				) : (
					<TransactionReviewInformation edit={this.edit} />
				)}
			</View>
		);
	};

	render = () => {
		const { transactionConfirmed } = this.props;
		const { actionKey, error } = this.state;
		return (
			<View style={styles.root}>
				{this.renderTransactionDirection()}
				<ActionView
					confirmButtonMode="confirm"
					cancelText={strings('transaction.reject')}
					onCancelPress={this.props.onCancel}
					onConfirmPress={this.props.onConfirm}
					confirmed={transactionConfirmed}
					confirmDisabled={error !== undefined}
				>
					<View>
						<TransactionReviewSummary actionKey={actionKey} />
						<View style={styles.reviewForm}>{this.renderTransactionDetails()}</View>
						{error && <Text style={styles.error}>{error}</Text>}
					</View>
				</ActionView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	identities: state.engine.backgroundState.PreferencesController.identities,
	showHexData: state.settings.showHexData,
	transaction: state.transaction
});

export default connect(mapStateToProps)(TransactionReview);
