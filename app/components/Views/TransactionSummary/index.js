import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
	summaryWrapper: {
		flexDirection: 'column',
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		padding: 16
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
	textFee: {
		fontStyle: 'italic'
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
	},
	transactionFeeLeft: {
		display: 'flex',
		flexDirection: 'row'
	},
	transactionEditText: {
		fontSize: 12,
		marginLeft: 8
	}
});

export default class TransactionSummary extends PureComponent {
	static propTypes = {
		amount: PropTypes.string,
		fee: PropTypes.string,
		totalAmount: PropTypes.string,
		secondaryTotalAmount: PropTypes.string,
		gasEstimationReady: PropTypes.bool,
		onEditPress: PropTypes.func
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
		const { amount, fee, totalAmount, secondaryTotalAmount, gasEstimationReady, onEditPress } = this.props;
		return (
			<View style={styles.summaryWrapper}>
				<View style={styles.summaryRow}>
					<Text style={styles.textSummary}>{strings('transaction.amount')}</Text>
					<Text style={[styles.textSummary, styles.textSummaryAmount]}>{amount}</Text>
				</View>
				<View style={styles.summaryRow}>
					<View style={styles.transactionFeeLeft}>
						<Text style={[styles.textSummary, !fee ? styles.textFee : null]}>
							{!fee
								? strings('transaction.transaction_fee_less')
								: strings('transaction.transaction_fee')}
						</Text>
						{!fee || !onEditPress ? null : (
							<TouchableOpacity
								disabled={!gasEstimationReady}
								onPress={onEditPress}
								key="transactionFeeEdit"
							>
								<Text style={[styles.actionText, styles.transactionEditText]}>
									{strings('transaction.edit')}
								</Text>
							</TouchableOpacity>
						)}
					</View>
					{!!fee &&
						this.renderIfGastEstimationReady(
							<Text style={[styles.textSummary, styles.textSummaryAmount]}>{fee}</Text>
						)}
				</View>
				<View style={styles.separator} />
				<View style={styles.summaryRow}>
					<Text style={[styles.textSummary, styles.textBold]}>{strings('transaction.total_amount')}</Text>
					{this.renderIfGastEstimationReady(
						<Text style={[styles.textSummary, styles.textSummaryAmount, styles.textBold]}>
							{totalAmount}
						</Text>
					)}
				</View>
				<View style={styles.totalCryptoRow}>
					{this.renderIfGastEstimationReady(
						<Text style={[styles.textSummary, styles.textCrypto]}>{secondaryTotalAmount}</Text>
					)}
				</View>
			</View>
		);
	};
}
