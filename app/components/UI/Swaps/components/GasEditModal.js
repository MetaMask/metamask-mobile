import React, { useCallback, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Modal from 'react-native-modal';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { connect } from 'react-redux';

import Text from '../../../Base/Text';
import InfoModal from './InfoModal';
import EditGasFeeLegacy from '../../EditGasFeeLegacy';
import EditGasFee1559 from '../../EditGasFee1559';
import { parseTransactionEIP1559, parseTransactionLegacy } from '../../../../util/transactions';
import useModalHandler from '../../../Base/hooks/useModalHandler';

const styles = StyleSheet.create({
	bottomModal: {
		justifyContent: 'flex-end',
		margin: 0
	},
	keyboardAwareWrapper: {
		flex: 1,
		justifyContent: 'flex-end'
	},
	text: {
		lineHeight: 20
	}
});

const RECOMMENDED = 'high';

function GasEditModal({
	dismiss,
	gasEstimateType,
	gasFeeEstimates,
	defaultGasFeeOptionLegacy = 'medium',
	defaultGasFeeOptionFeeMarket = 'high',
	isVisible,
	onGasUpdate,
	customGasFee,
	customGasLimit,
	selectedQuoteGasLimit,
	currentCurrency,
	conversionRate,
	nativeCurrency,
	primaryCurrency,
	chainId,
	ticker
}) {
	const [gasSelected, setGasSelected] = useState(
		customGasFee
			? customGasFee.selected ?? null
			: gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
			? defaultGasFeeOptionFeeMarket
			: defaultGasFeeOptionLegacy
	);
	const [stopUpdateGas, setStopUpdateGas] = useState(false);
	const [EIP1559TransactionDataTemp, setEIP1559TransactionDataTemp] = useState({});
	const [LegacyTransactionDataTemp, setLegacyTransactionDataTemp] = useState({});
	const [isGasFeeRecommendationVisible, , showGasFeeRecommendation, hideGasFeeRecommendation] = useModalHandler(
		false
	);

	useEffect(() => {
		if (stopUpdateGas || !gasSelected) {
			return;
		}
		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			setEIP1559TransactionDataTemp(
				parseTransactionEIP1559(
					{
						currentCurrency,
						conversionRate,
						nativeCurrency,
						selectedGasFee: {
							suggestedMaxFeePerGas: gasFeeEstimates[gasSelected].suggestedMaxFeePerGas,
							suggestedMaxPriorityFeePerGas: gasFeeEstimates[gasSelected].suggestedMaxPriorityFeePerGas,
							suggestedGasLimit: customGasLimit || selectedQuoteGasLimit,
							estimatedBaseFee: gasFeeEstimates.estimatedBaseFee,
							selectedOption: gasSelected,
							recommended: RECOMMENDED
						}
					},
					{ onlyGas: true }
				)
			);
		} else {
			setLegacyTransactionDataTemp(
				parseTransactionLegacy(
					{
						currentCurrency,
						conversionRate,
						ticker,
						selectedGasFee: {
							suggestedGasLimit: customGasLimit || selectedQuoteGasLimit,
							suggestedGasPrice:
								gasEstimateType === GAS_ESTIMATE_TYPES.ETH_GASPRICE
									? gasFeeEstimates.gasPrice
									: gasFeeEstimates[gasSelected]
						}
					},
					{ onlyGas: true }
				)
			);
		}
	}, [
		stopUpdateGas,
		conversionRate,
		currentCurrency,
		nativeCurrency,
		gasEstimateType,
		gasFeeEstimates,
		gasSelected,
		selectedQuoteGasLimit,
		ticker,
		customGasLimit
	]);

	const calculateTempGasFee = useCallback(
		({ suggestedMaxFeePerGas, suggestedMaxPriorityFeePerGas, suggestedGasLimit, estimatedBaseFee }, selected) => {
			setStopUpdateGas(!selected);
			setGasSelected(selected);
			setEIP1559TransactionDataTemp(
				parseTransactionEIP1559(
					{
						currentCurrency,
						conversionRate,
						nativeCurrency,
						selectedGasFee: {
							suggestedMaxFeePerGas,
							suggestedMaxPriorityFeePerGas,
							suggestedGasLimit,
							estimatedBaseFee,
							selectedOption: selected,
							recommended: RECOMMENDED
						}
					},
					{ onlyGas: true }
				)
			);
		},
		[conversionRate, currentCurrency, nativeCurrency]
	);

	const calculateTempGasFeeLegacy = useCallback(
		({ suggestedGasLimit, suggestedGasPrice }, selected) => {
			setStopUpdateGas(!selected);
			setGasSelected(selected);
			setLegacyTransactionDataTemp(
				parseTransactionLegacy(
					{
						currentCurrency,
						conversionRate,
						ticker,
						selectedGasFee: {
							suggestedGasLimit,
							suggestedGasPrice
						}
					},
					{ onlyGas: true }
				)
			);
		},
		[conversionRate, currentCurrency, ticker]
	);

	const saveGasEdition = useCallback(
		selected => {
			if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
				const {
					suggestedMaxFeePerGas: maxFeePerGas,
					suggestedMaxPriorityFeePerGas: maxPriorityFeePerGas,
					suggestedGasLimit
				} = EIP1559TransactionDataTemp;
				onGasUpdate(
					{
						maxFeePerGas,
						maxPriorityFeePerGas,
						selected
					},
					suggestedGasLimit
				);
			} else {
				const { suggestedGasPrice: gasPrice, suggestedGasLimit } = LegacyTransactionDataTemp;
				onGasUpdate(
					{
						gasPrice,
						selected
					},
					suggestedGasLimit
				);
			}
			dismiss();
		},
		[EIP1559TransactionDataTemp, LegacyTransactionDataTemp, dismiss, gasEstimateType, onGasUpdate]
	);

	const cancelGasEdition = useCallback(() => {
		setGasSelected(
			customGasFee
				? customGasFee.selected ?? null
				: gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET
				? 'high'
				: 'medium'
		);
		dismiss();
	}, [customGasFee, dismiss, gasEstimateType]);

	return (
		<Modal
			isVisible={isVisible}
			animationIn="slideInUp"
			animationOut="slideOutDown"
			style={styles.bottomModal}
			backdropOpacity={0.7}
			animationInTiming={600}
			animationOutTiming={600}
			onBackdropPress={cancelGasEdition}
			onBackButtonPress={cancelGasEdition}
			onSwipeComplete={cancelGasEdition}
			swipeDirection={'down'}
			propagateSwipe
		>
			<KeyboardAwareScrollView contentContainerStyle={styles.keyboardAwareWrapper}>
				{gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET ? (
					<>
						<EditGasFee1559
							selected={gasSelected}
							ignoreOptions={['low']}
							warningMinimumEstimateOption={'medium'}
							suggestedEstimateOption={defaultGasFeeOptionFeeMarket}
							gasFee={EIP1559TransactionDataTemp}
							gasOptions={gasFeeEstimates}
							onChange={calculateTempGasFee}
							gasFeeNative={EIP1559TransactionDataTemp.renderableGasFeeMinNative}
							gasFeeConversion={EIP1559TransactionDataTemp.renderableGasFeeMinConversion}
							gasFeeMaxNative={EIP1559TransactionDataTemp.renderableGasFeeMaxNative}
							gasFeeMaxConversion={EIP1559TransactionDataTemp.renderableGasFeeMaxConversion}
							maxPriorityFeeNative={EIP1559TransactionDataTemp.renderableMaxPriorityFeeNative}
							maxPriorityFeeConversion={EIP1559TransactionDataTemp.renderableMaxPriorityFeeConversion}
							maxFeePerGasNative={EIP1559TransactionDataTemp.renderableMaxFeePerGasNative}
							maxFeePerGasConversion={EIP1559TransactionDataTemp.renderableMaxFeePerGasConversion}
							primaryCurrency={primaryCurrency}
							chainId={chainId}
							timeEstimate={EIP1559TransactionDataTemp.timeEstimate}
							timeEstimateColor={EIP1559TransactionDataTemp.timeEstimateColor}
							onCancel={cancelGasEdition}
							onSave={saveGasEdition}
							error={EIP1559TransactionDataTemp.error}
							recommended={{
								name: 'high',
								// eslint-disable-next-line react/display-name
								render: () => (
									<TouchableOpacity onPress={showGasFeeRecommendation}>
										<Text noMargin link bold small centered>
											Recommended{' ' /* TODO:  i18n */}
											<MaterialCommunityIcon
												name="information"
												size={14}
												style={styles.labelInfo}
											/>
										</Text>
									</TouchableOpacity>
								)
							}}
						/>
						<InfoModal
							isVisible={isVisible && isGasFeeRecommendationVisible}
							toggleModal={hideGasFeeRecommendation}
							title={'Recommended gas fee'} // TODO: i18n
							body={
								<Text style={styles.text}>
									Swaps are typically time sensitive. “High” will help avoid potential losses due to
									changes in market conditions.
								</Text>
							}
						/>
					</>
				) : (
					<EditGasFeeLegacy
						selected={gasSelected}
						ignoreOptions={['low']}
						warningMinimumEstimateOption={'medium'}
						gasFee={LegacyTransactionDataTemp}
						gasEstimateType={gasEstimateType}
						gasOptions={gasFeeEstimates}
						onChange={calculateTempGasFeeLegacy}
						gasFeeNative={LegacyTransactionDataTemp.transactionFee}
						gasFeeConversion={LegacyTransactionDataTemp.transactionFeeFiat}
						gasPriceConversion={LegacyTransactionDataTemp.transactionFeeFiat}
						error={LegacyTransactionDataTemp.error}
						primaryCurrency={primaryCurrency}
						chainId={chainId}
						onCancel={cancelGasEdition}
						onSave={saveGasEdition}
					/>
				)}
			</KeyboardAwareScrollView>
		</Modal>
	);
}

GasEditModal.propTypes = {
	/**
	 * Function to dismiss modal
	 */
	dismiss: PropTypes.func,
	/**
	 * Estimate type returned by the gas fee controller, can be fee-market, legacy, eth_gasPrice or none
	 */
	gasEstimateType: PropTypes.string,
	/**
	 * Gas fee estimates returned by the gas fee controller
	 */
	gasFeeEstimates: PropTypes.object,
	/**
	 * Default gas option ('low', 'medium' or 'high') to for fee-market estimate type
	 * This is used to show a warning below this option
	 */
	defaultGasFeeOptionFeeMarket: PropTypes.string,
	/**
	 * Default gas option ('low', 'medium' or 'high') to for legacy estimate types
	 * This is used to show a warning below this option
	 */
	defaultGasFeeOptionLegacy: PropTypes.string,
	/**
	 * Wether this modal is visible
	 */
	isVisible: PropTypes.bool,
	/**
	 * Function that handles user saving the gas editors
	 * It is called with arguments (customGas, )
	 */
	onGasUpdate: PropTypes.func,
	/**
	 * usedCustomGas from Swaps Controller
	 */
	customGasFee: PropTypes.object,
	/**
	 * Custom gas limit set by the user
	 */
	customGasLimit: PropTypes.string,
	/**
	 * Gas limit of the selected quote trade
	 */
	selectedQuoteGasLimit: PropTypes.string,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	nativeCurrency: PropTypes.string,
	/**
	 * Primary currency, either ETH or Fiat
	 */
	primaryCurrency: PropTypes.string,
	/**
	 * Chain Id
	 */
	chainId: PropTypes.string,
	/**
	 * Current network ticker
	 */
	ticker: PropTypes.string
};
const mapStateToProps = state => ({
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
	primaryCurrency: state.settings.primaryCurrency
});

export default connect(mapStateToProps)(GasEditModal);
