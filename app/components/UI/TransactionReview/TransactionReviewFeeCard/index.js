import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { colors } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';
import Summary from '../../../Base/Summary';
import Text from '../../../Base/Text';
import InfoModal from '../../../UI/Swaps/components/InfoModal';
import { isMainnetByChainId } from '../../../../util/networks';
import { connect } from 'react-redux';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

const styles = StyleSheet.create({
	overview: {
		marginHorizontal: 24
	},
	loader: {
		backgroundColor: colors.white,
		height: 10,
		flex: 1,
		alignItems: 'flex-end'
	},
	over: {
		color: colors.red
	},
	customNonce: {
		marginTop: 10,
		marginHorizontal: 24,
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		paddingVertical: 14,
		paddingHorizontal: 16,
		display: 'flex',
		flexDirection: 'row'
	},
	nonceNumber: {
		marginLeft: 'auto'
	},
	valuesContainer: {
		flex: 1,
		flexDirection: 'row'
	},
	gasInfoIcon: {
		paddingLeft: 2
	},
	amountContainer: {
		flex: 1
	},
	gasFeeTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	fiatContainer: {
		width: 66
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
		totalFiat: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node, PropTypes.string]),
		/**
		 * Transaction value in fiat before gas fee
		 */
		fiat: PropTypes.string,
		/**
		 * Total transaction value in ETH
		 */
		totalValue: PropTypes.object,
		/**
		 * Transaction value in ETH before gas fee
		 */
		transactionValue: PropTypes.string,
		/**
		 * ETH or fiat, dependent on user setting
		 */
		primaryCurrency: PropTypes.string,
		/**
		 * Changes mode to edit
		 */
		edit: PropTypes.func,
		/**
		 * True if transaction is over the available funds
		 */
		over: PropTypes.bool,
		/**
		 * True if transaction is gas price is higher than the "FAST" value
		 */
		warningGasPriceHigh: PropTypes.string,
		/**
		 * Indicates whether custom nonce should be shown in transaction editor
		 */
		showCustomNonce: PropTypes.bool,
		/**
		 * Current nonce
		 */
		nonceValue: PropTypes.number,
		/**
		 * Function called when editing nonce
		 */
		onNonceEdit: PropTypes.func,
		/**
		 * A string representing the network chainId
		 */
		chainId: PropTypes.string
	};

	state = {
		showGasTooltip: false
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

	openLinkAboutGas = () => Linking.openURL('https://ethereum.org/en/developers/docs/gas/');

	toggleGasTooltip = () => this.setState(state => ({ showGasTooltip: !state.showGasTooltip }));

	renderGasTooltip = () => (
		<InfoModal
			isVisible={this.state.showGasTooltip}
			title="Ethereum gas fees"
			toggleModal={this.toggleGasTooltip}
			body={
				<View>
					<Text grey infoModal>
						Gas fees are paid to crypto miners who process transactions on the Ethereum network.{' '}
						<Text bold>MetaMask does not profit from gas fees.</Text>
					</Text>
					<Text grey infoModal>
						Gas fees fluctuate based on network traffic and transaction complexitity.
					</Text>
					<TouchableOpacity onPress={this.openLinkAboutGas}>
						<Text grey link infoModal>
							Learn more about gas fees
						</Text>
					</TouchableOpacity>
				</View>
			}
		/>
	);

	render() {
		const {
			totalGasFiat,
			totalGasEth,
			totalFiat,
			fiat,
			totalValue,
			transactionValue,
			primaryCurrency,
			edit,
			over,
			warningGasPriceHigh,
			showCustomNonce,
			nonceValue,
			onNonceEdit,
			chainId
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

		const isMainnet = isMainnetByChainId(chainId);

		return (
			<View>
				<Summary style={styles.overview}>
					<Summary.Row>
						<Text primary bold>
							{strings('transaction.amount')}
						</Text>
						<View style={styles.valuesContainer}>
							<Text upper right grey style={styles.amountContainer}>
								{amount}
							</Text>
							{isMainnet && (
								<Text upper primary bold right style={styles.fiatContainer}>
									{fiat}
								</Text>
							)}
						</View>
					</Summary.Row>
					<Summary.Row>
						<View>
							<View style={styles.gasFeeTitleContainer}>
								<Text primary bold>
									{strings('transaction.gas_fee')}
								</Text>
								<TouchableOpacity style={styles.gasInfoIcon} onPress={this.toggleGasTooltip}>
									<MaterialIcon name="info" size={13} style={{ color: colors.blue }} />
								</TouchableOpacity>
							</View>
						</View>
						{this.renderIfGasEstimationReady(
							<View style={styles.valuesContainer}>
								<TouchableOpacity style={styles.amountContainer} onPress={edit}>
									<Text upper right link underline style={warningGasPriceHigh && styles.over}>
										{networkFee}
									</Text>
								</TouchableOpacity>
								{isMainnet && (
									<Text primary bold upper right style={styles.fiatContainer}>
										{totalGasFiat}
									</Text>
								)}
							</View>
						)}
					</Summary.Row>
					<Summary.Separator />
					<Summary.Row>
						<Text primary bold style={(over && styles.over) || null}>
							{strings('transaction.total')}
						</Text>

						{!!totalFiat &&
							this.renderIfGasEstimationReady(
								<View style={styles.valuesContainer}>
									<Text blue upper right style={styles.amountContainer}>
										{totalAmount}
									</Text>
									{isMainnet && (
										<Text bold primary upper right style={styles.fiatContainer}>
											{equivalentTotalAmount}
										</Text>
									)}
								</View>
							)}
					</Summary.Row>
				</Summary>
				{showCustomNonce && (
					<TouchableOpacity style={styles.customNonce} onPress={onNonceEdit}>
						<Text bold black>
							{strings('transaction.custom_nonce')}
						</Text>
						<Text bold link>
							{'  '}
							{strings('transaction.edit')}
						</Text>
						<Text bold black style={styles.nonceNumber}>
							{nonceValue}
						</Text>
					</TouchableOpacity>
				)}
				{this.renderGasTooltip()}
			</View>
		);
	}
}

const mapStateToProps = state => ({
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId
});

export default connect(mapStateToProps)(TransactionReviewFeeCard);
