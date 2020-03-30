import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	summaryWrapper: {
		flexDirection: 'column',
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		padding: 16,
		marginHorizontal: 24
	},
	summaryRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 6
	},
	totalCryptoRow: {
		alignItems: 'flex-end',
		marginTop: 8
	},
	textSummary: {
		...fontStyles.normal,
		color: colors.black,
		fontSize: 12
	},
	textSummaryAmount: {
		textTransform: 'uppercase'
	},
	textCrypto: {
		...fontStyles.normal,
		textAlign: 'right',
		fontSize: 12,
		textTransform: 'uppercase',
		color: colors.grey500
	},
	textBold: {
		...fontStyles.bold,
		alignSelf: 'flex-end'
	},
	separator: {
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		marginVertical: 6
	},
	loader: {
		backgroundColor: colors.white,
		height: 10
	}
});

export default class TransactionSummary extends PureComponent {
	static propTypes = {
		transactionValueFiat: PropTypes.string,
		transactionFeeFiat: PropTypes.string,
		transactionTotalAmountFiat: PropTypes.string,
		transactionTotalAmount: PropTypes.string,
		gasEstimationReady: PropTypes.bool
	};

	renderIfGastEstimationReady = children => {
		const { gasEstimationReady } = this.props;
		return !gasEstimationReady ? (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		) : (
			children
		);
	};

	render = () => {
		const {
			transactionValueFiat,
			transactionFeeFiat,
			transactionTotalAmountFiat,
			transactionTotalAmount
		} = this.props;
		return (
			<View style={styles.summaryWrapper}>
				<View style={styles.summaryRow}>
					<Text style={styles.textSummary}>{strings('transaction.amount')}</Text>
					<Text style={[styles.textSummary, styles.textSummaryAmount]}>{transactionValueFiat}</Text>
				</View>
				<View style={styles.summaryRow}>
					<Text style={styles.textSummary}>{strings('transaction.transaction_fee')}</Text>
					{this.renderIfGastEstimationReady(
						<Text style={[styles.textSummary, styles.textSummaryAmount]}>{transactionFeeFiat}</Text>
					)}
				</View>
				<View style={styles.separator} />
				<View style={styles.summaryRow}>
					<Text style={[styles.textSummary, styles.textBold]}>{strings('transaction.total_amount')}</Text>
					{this.renderIfGastEstimationReady(
						<Text style={[styles.textSummary, styles.textSummaryAmount, styles.textBold]}>
							{transactionTotalAmountFiat}
						</Text>
					)}
				</View>
				<View style={styles.totalCryptoRow}>
					{this.renderIfGastEstimationReady(
						<Text style={[styles.textSummary, styles.textCrypto]}>{transactionTotalAmount}</Text>
					)}
				</View>
			</View>
		);
	};
}
