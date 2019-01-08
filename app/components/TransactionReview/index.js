import React, { Component } from 'react';
import ActionView from '../ActionView';
import Identicon from '../Identicon';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { connect } from 'react-redux';
import { strings } from '../../../locales/i18n';
import { getTransactionReviewActionKey } from '../../util/transactions';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import TransactionReviewInformation from './TransactionReviewInformation';
import TransactionReviewData from './TransactionReviewData';
import TransactionReviewSummary from './TransactionReviewSummary';

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
		flexShrink: 0,
		paddingHorizontal: 16
	},
	addressText: {
		...fontStyles.bold,
		flex: 1,
		fontSize: 16,
		marginLeft: 9
	},
	arrow: {
		backgroundColor: colors.white,
		borderColor: colors.lightGray,
		borderRadius: 15,
		borderWidth: 1,
		flex: 0,
		height: 30,
		left: '50%',
		marginTop: -15,
		position: 'absolute',
		top: '50%',
		width: 30,
		zIndex: 1
	},
	arrowIcon: {
		color: colors.gray,
		marginLeft: 3,
		marginTop: 3
	},
	addressGraphic: {
		alignItems: 'center',
		flexDirection: 'row',
		flexGrow: 1,
		flexShrink: 1,
		height: 42,
		width: '50%'
	},
	fromGraphic: {
		borderColor: colors.inputBorderColor,
		borderRightWidth: 1,
		paddingRight: 32
	},
	toGraphic: {
		paddingLeft: 32
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
	}
});

/**
 * Component that supports reviewing a transaction
 */
class TransactionReview extends Component {
	static propTypes = {
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
		 * Currently-active account address in the current keychain
		 */
		selectedAddress: PropTypes.string,
		/**
		 * Indicates whether hex data should be shown in transaction editor
		 */
		showHexData: PropTypes.bool,
		/**
		 * Transaction object associated with this transaction
		 */
		transactionData: PropTypes.object,
		/**
		 * Callback to validate amount in transaction in parent state
		 */
		validateAmount: PropTypes.func
	};

	state = {
		toFocused: false,
		amountError: '',
		actionKey: strings('transactions.tx_review_confirm'),
		showHexData: false
	};

	componentDidMount = async () => {
		const {
			validateAmount,
			transactionData,
			transactionData: { data }
		} = this.props;
		let { showHexData } = this.props;
		showHexData = showHexData || data;
		const amountError = validateAmount && validateAmount();
		const actionKey = await getTransactionReviewActionKey(transactionData);
		this.setState({ amountError, actionKey, showHexData });
	};

	edit = () => {
		const { onModeChange } = this.props;
		onModeChange && onModeChange('edit');
	};

	renderTransactionDirection = () => {
		const {
			transactionData: { from = this.props.selectedAddress, to }
		} = this.props;
		return (
			<View style={styles.graphic}>
				<View style={{ ...styles.addressGraphic, ...styles.fromGraphic }}>
					<Identicon address={from} diameter={18} />
					<Text style={styles.addressText} numberOfLines={1}>
						{from}
					</Text>
				</View>
				<View style={styles.arrow}>
					<MaterialIcon name={'arrow-forward'} size={22} style={styles.arrowIcon} />
				</View>
				<View style={{ ...styles.addressGraphic, ...styles.toGraphic }}>
					<Identicon address={to} diameter={18} />
					<Text style={styles.addressText} numberOfLines={1}>
						{to}
					</Text>
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
		const { transactionData } = this.props;
		return (
			<View style={styles.overview}>
				{showHexData && transactionData.data ? (
					<ScrollableTabView ref={this.scrollableTabViewRef} renderTabBar={this.renderTabBar}>
						<TransactionReviewInformation
							edit={this.edit}
							transactionData={transactionData}
							tabLabel={strings('transaction.review_details')}
						/>
						<TransactionReviewData
							transactionData={transactionData}
							actionKey={actionKey}
							tabLabel={strings('transaction.review_data')}
						/>
					</ScrollableTabView>
				) : (
					<TransactionReviewInformation edit={this.edit} transactionData={transactionData} />
				)}
			</View>
		);
	};

	render = () => {
		const { transactionData } = this.props;
		const { actionKey } = this.state;
		return (
			<View style={styles.root}>
				{this.renderTransactionDirection()}
				<ActionView
					confirmButtonMode="confirm"
					cancelText={strings('transaction.reject')}
					onCancelPress={this.props.onCancel}
					onConfirmPress={this.props.onConfirm}
				>
					<TransactionReviewSummary
						edit={this.edit}
						transactionData={transactionData}
						actionKey={actionKey}
					/>
					<View style={styles.reviewForm}>{this.renderTransactionDetails()}</View>
				</ActionView>
			</View>
		);
	};
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	showHexData: state.settings.showHexData
});

export default connect(mapStateToProps)(TransactionReview);
