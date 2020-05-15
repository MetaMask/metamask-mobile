import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, fontStyles } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	overview: {
		borderWidth: 1,
		borderColor: colors.grey200,
		borderRadius: 10,
		padding: 16,
		marginHorizontal: 24
	},
	overviewAccent: {
		color: colors.blue
	},
	overviewCol: {
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'column'
	},
	topOverviewCol: {
		borderBottomWidth: 1,
		borderColor: colors.grey200,
		paddingBottom: 10
	},
	bottomOverviewCol: {
		paddingTop: 10
	},
	amountRow: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	amountRowBottomSpace: {
		paddingBottom: 10
	},
	totalValueRow: {
		justifyContent: 'flex-end'
	},
	networkTextWrapper: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center'
	},
	overviewText: {
		...fontStyles.bold,
		color: colors.fontPrimary,
		fontSize: 14
	},
	networkFeeText: {
		paddingRight: 5
	},
	totalValueText: {
		color: colors.fontSecondary
	},
	loader: {
		backgroundColor: colors.white,
		height: 10
	}
});

/**
 * PureComponent that displays a transaction's fee and total details inside a card
 */
class TransactionReviewFeeCard extends PureComponent {
	static propTypes = {
		/**
		 * True if gas estimation for a transaction is complete
		 */
		gasEstimationReady: PropTypes.bool,
		/**
		 * Total gas fee in fiat
		 */
		totalGasFiat: PropTypes.string,
		/**
		 * Total gas fee in ETH
		 */
		totalGasEth: PropTypes.string,
		/**
		 * Total transaction value in fiat
		 */
		totalFiat: PropTypes.string,
		/**
		 * Transaction value in fiat before gas fee
		 */
		fiat: PropTypes.string,
		/**
		 * Total transaction value in ETH
		 */
		totalValue: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
		/**
		 * Transaction value in ETH before gas fee
		 */
		transactionValue: PropTypes.string,
		/**
		 * ETH or fiat, dependent on user setting
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Toggles the gas fee customization modal
		 */
		toggleCustomGasModal: PropTypes.func
	};

	renderIfGasEstimationReady = children => {
		const { gasEstimationReady } = this.props;
		return !gasEstimationReady ? (
			<View style={styles.loader}>
				<ActivityIndicator size="small" />
			</View>
		) : (
			children
		);
	};

	render() {
		const {
			totalGasFiat,
			totalGasEth,
			totalFiat,
			fiat,
			totalValue,
			transactionValue,
			primaryCurrency,
			gasEstimationReady,
			toggleCustomGasModal
		} = this.props;
		let amount;
		let networkFee;
		let totalAmount;
		let equivalentTotalAmount;
		if (primaryCurrency === 'ETH') {
			amount = transactionValue;
			networkFee = totalGasEth;
			totalAmount = totalValue;
			equivalentTotalAmount = totalFiat;
		} else {
			amount = fiat;
			networkFee = totalGasFiat;
			totalAmount = totalFiat;
			equivalentTotalAmount = totalValue;
		}
		return (
			<View style={styles.overview}>
				<View style={[styles.overviewCol, styles.topOverviewCol]}>
					<View style={[styles.amountRow, styles.amountRowBottomSpace]}>
						<Text style={styles.overviewText}>{strings('transaction.amount')}</Text>
						<Text style={styles.overviewText}>{amount}</Text>
					</View>
					<View style={styles.amountRow}>
						<View style={styles.networkTextWrapper}>
							<Text style={[styles.overviewText, styles.networkFeeText]}>
								{strings('transaction.gas_fee')}
							</Text>
							<TouchableOpacity onPress={toggleCustomGasModal} disabled={!gasEstimationReady}>
								<Text style={[styles.overviewText, styles.overviewAccent]}>
									{strings('transaction.edit')}
								</Text>
							</TouchableOpacity>
						</View>
						{this.renderIfGasEstimationReady(<Text style={styles.overviewText}>{networkFee}</Text>)}
					</View>
				</View>
				<View style={[styles.overviewCol, styles.bottomOverviewCol]}>
					<View style={[styles.amountRow, styles.amountRowBottomSpace]}>
						<Text style={styles.overviewText}>
							{strings('transaction.total')} {strings('transaction.amount')}
						</Text>
						{!!totalFiat &&
							this.renderIfGasEstimationReady(<Text style={styles.overviewText}>{totalAmount}</Text>)}
					</View>
					<View style={[styles.amountRow, styles.totalValueRow]}>
						{this.renderIfGasEstimationReady(
							<Text style={[styles.overviewText, styles.totalValueText]}>{equivalentTotalAmount}</Text>
						)}
					</View>
				</View>
			</View>
		);
	}
}

export default TransactionReviewFeeCard;
