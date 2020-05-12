import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, InteractionManager } from 'react-native';
import StyledButton from '../StyledButton';
import { colors, fontStyles } from '../../../styles/common';
import { connect } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { getTransactionReviewActionKey, getNormalizedTxState } from '../../../util/transactions';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import DefaultTabBar from 'react-native-scrollable-tab-view/DefaultTabBar';
import TransactionReviewInformation from './TransactionReviewInformation';
import TransactionReviewData from './TransactionReviewData';
import TransactionReviewSummary from './TransactionReviewSummary';
import Analytics from '../../../core/Analytics';
import { ANALYTICS_EVENT_OPTS } from '../../../util/analytics';
import TransactionHeader from '../TransactionHeader';
import AccountInfoCard from '../AccountInfoCard';

const styles = StyleSheet.create({
	tabUnderlineStyle: {
		height: 2,
		backgroundColor: colors.blue
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
	accountInfoCardWrapper: {
		paddingHorizontal: 24
	},
	error: {
		backgroundColor: colors.red000,
		color: colors.red,
		marginTop: 5,
		paddingVertical: 8,
		paddingHorizontal: 5,
		textAlign: 'center',
		fontSize: 12,
		letterSpacing: 0.5,
		marginHorizontal: 14,
		...fontStyles.normal
	},
	actionContainer: {
		flex: 0,
		flexDirection: 'row',
		paddingVertical: 16,
		paddingHorizontal: 24
	},
	button: {
		flex: 1
	},
	cancel: {
		marginRight: 8
	},
	confirm: {
		marginLeft: 8
	}
});

/**
 * PureComponent that supports reviewing a transaction
 */
class TransactionReview extends PureComponent {
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
		validate: PropTypes.func,
		/**
		 * Browser/tab information
		 */
		browser: PropTypes.object
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
		InteractionManager.runAfterInteractions(() => {
			Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_CONFIRM_STARTED);
		});
	};

	edit = () => {
		const { onModeChange } = this.props;
		Analytics.trackEvent(ANALYTICS_EVENT_OPTS.TRANSACTIONS_EDIT_TRANSACTION);
		onModeChange && onModeChange('edit');
	};

	renderTabBar() {
		return (
			<DefaultTabBar
				underlineStyle={styles.tabUnderlineStyle}
				activeTextColor={colors.blue}
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
			<React.Fragment>
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
			</React.Fragment>
		);
	};

	getUrlFromBrowser() {
		const { browser } = this.props;
		let url;
		browser.tabs.forEach(tab => {
			if (tab.id === browser.activeTab) {
				url = tab.url;
			}
		});
		return url;
	}

	render = () => {
		const { transactionConfirmed } = this.props;
		const { actionKey, error } = this.state;
		const currentPageInformation = { url: this.getUrlFromBrowser() };
		return (
			<React.Fragment>
				<TransactionHeader currentPageInformation={currentPageInformation} />
				<React.Fragment>
					<TransactionReviewSummary actionKey={actionKey} />
					<View style={styles.accountInfoCardWrapper}>
						<AccountInfoCard />
					</View>
					{this.renderTransactionDetails()}
					{!!error && <Text style={styles.error}>{error}</Text>}
				</React.Fragment>
				<View style={styles.actionContainer}>
					<StyledButton
						type={'cancel'}
						onPress={this.props.onCancel}
						containerStyle={[styles.button, styles.cancel]}
						disabled={transactionConfirmed}
					>
						{strings('transaction.reject')}
					</StyledButton>
					<StyledButton
						type={'confirm'}
						onPress={this.props.onConfirm}
						containerStyle={[styles.button, styles.confirm]}
						disabled={transactionConfirmed || error !== undefined}
					>
						{strings('transaction.confirm')}
					</StyledButton>
				</View>
			</React.Fragment>
		);
	};
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	showHexData: state.settings.showHexData,
	transaction: getNormalizedTxState(state),
	browser: state.browser
});

export default connect(mapStateToProps)(TransactionReview);
