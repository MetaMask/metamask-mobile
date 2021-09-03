import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import WarningMessage from '../../../Views/SendFlow/WarningMessage';

const styles = StyleSheet.create({
	confirmBadge: {
		...fontStyles.normal,
		alignItems: 'center',
		borderColor: colors.grey400,
		borderRadius: 12,
		borderWidth: 1,
		color: colors.black,
		fontSize: 10,
		paddingVertical: 4,
		paddingHorizontal: 8,
		textAlign: 'center',
	},
	summary: {
		backgroundColor: colors.beige,
		padding: 24,
		paddingTop: 12,
		paddingBottom: 16,
		alignItems: 'center',
	},
	summaryPrimary: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 44,
		paddingTop: 16,
		paddingBottom: 4,
		textTransform: 'uppercase',
		textAlign: 'center',
	},
	summarySecondary: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 24,
		textTransform: 'uppercase',
		textAlign: 'center',
	},
	warning: {
		width: '100%',
		paddingHorizontal: 24,
		paddingTop: 12,
	},
});

/**
 * PureComponent that supports reviewing transaction summary
 */
class TransactionReviewSummary extends PureComponent {
	static propTypes = {
		/**
		 * ETH to current currency conversion rate
		 */
		conversionRate: PropTypes.number,
		/**
		 * Transaction corresponding action key
		 */
		actionKey: PropTypes.string,
		/**
		 * Transaction amount in ETH before gas
		 */
		assetAmount: PropTypes.string,
		/**
		 * Transaction amount in fiat before gas
		 */
		fiatValue: PropTypes.string,
		/**
		 * Approve type transaction or not
		 */
		approveTransaction: PropTypes.bool,
		/**
		 * ETH or fiat, depending on user setting
		 */
		primaryCurrency: PropTypes.string,
	};

	renderWarning = () => <Text>{`${strings('transaction.approve_warning')} ${this.props.assetAmount}`}</Text>;

	render = () => {
		const { actionKey, assetAmount, conversionRate, fiatValue, approveTransaction, primaryCurrency } = this.props;
		return (
			<View>
				{!!approveTransaction && (
					<View style={styles.warning}>
						<WarningMessage warningMessage={this.renderWarning()} />
					</View>
				)}
				<View style={styles.summary}>
					<Text style={styles.confirmBadge} numberOfLines={1}>
						{actionKey}
					</Text>

					{!conversionRate ? (
						<Text style={styles.summaryPrimary}>{assetAmount}</Text>
					) : (
						<View>
							<Text style={styles.summaryPrimary}>
								{primaryCurrency === 'ETH' ? assetAmount : fiatValue}
							</Text>
							<Text style={styles.summarySecondary}>
								{primaryCurrency === 'ETH' ? fiatValue : assetAmount}
							</Text>
						</View>
					)}
				</View>
			</View>
		);
	};
}

export default TransactionReviewSummary;
