import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import EditGasFee1559 from '../EditGasFee1559';
import { connect } from 'react-redux';
import { GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import { fromWei } from '../../../util/number';
import { parseTransactionEIP1559 } from '../../../util/transactions';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';

/**
 * View that renders a list of transactions for a specific asset
 */
const SpeedUpEIP1559TX = ({
	gas,
	gasFeeEstimates,
	gasEstimateType,
	contractExchangeRates,
	primaryCurrency,
	currentCurrency,
	nativeCurrency,
	conversionRate,
	chainId,
	onCancel,
	onSave,
}) => {
	const [EIP1559TransactionData, setEIP1559TransactionData] = useState({});
	const [animateOnGasChange, setAnimateOnGasChange] = useState(false);
	const gasSelected = useRef(AppConstants.GAS_OPTIONS.MEDIUM);
	const stopUpdateGas = useRef(false);
	const pollToken = useRef(undefined);
	const firstTime = useRef(true);

	useEffect(() => {
		if (animateOnGasChange) setAnimateOnGasChange(false);
	}, [animateOnGasChange]);

	useEffect(() => {
		const { GasFeeController } = Engine.context;
		const startGasEstimatePolling = async () => {
			pollToken.current = await GasFeeController.getGasFeeEstimatesAndStartPolling(pollToken.current);
		};

		startGasEstimatePolling();

		return () => {
			GasFeeController.stopPolling(pollToken.current);
		};
	}, []);

	const parseTransactionDataEIP1559 = useCallback(
		(gasFee) => {
			const parsedTransactionEIP1559 = parseTransactionEIP1559(
				{
					gasSelected: gasSelected.current,
					contractExchangeRates,
					conversionRate,
					currentCurrency,
					nativeCurrency,
					selectedGasFee: { ...gasFee, estimatedBaseFee: gasFeeEstimates.estimatedBaseFee },
					gasFeeEstimates,
				},
				{ onlyGas: true }
			);

			return parsedTransactionEIP1559;
		},
		[contractExchangeRates, conversionRate, currentCurrency, gasFeeEstimates, nativeCurrency]
	);

	useEffect(() => {
		if (stopUpdateGas.current) return;
		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			const suggestedGasLimit = fromWei(gas, 'wei');

			const EIP1559TransactionData = parseTransactionDataEIP1559({
				...gasFeeEstimates[gasSelected.current],
				suggestedGasLimit,
				selectedOption: gasSelected.current,
			});

			if (firstTime.current) {
				// TODO MOVE THE initializes1559SpeedUpTransaction INTO HERE
			}

			firstTime.current = false;

			setAnimateOnGasChange(true);
			setEIP1559TransactionData(EIP1559TransactionData);
		}
	}, [gas, gasEstimateType, gasFeeEstimates, parseTransactionDataEIP1559]);

	const calculate1559TempGasFee = (gasValues, selected) => {
		if (selected && gas) {
			gasValues.suggestedGasLimit = fromWei(gas, 'wei');
		}

		setEIP1559TransactionData(parseTransactionDataEIP1559({ ...gasValues, selectedOption: selected }));
		stopUpdateGas.current = !selected;
		gasSelected.current = selected;
	};

	const getGasAnalyticsParams = () => ({
		//active_currency: { value: selectedAsset?.symbol, anonymous: true },
		//network_name: networkType,
		chain_id: chainId,
		gas_estimate_type: gasEstimateType,
		gas_mode: gasSelected.current ? 'Basic' : 'Advanced',
		speed_set: gasSelected.current || undefined,
	});

	return (
		<EditGasFee1559
			selected={gasSelected.current}
			gasFee={EIP1559TransactionData}
			gasOptions={gasFeeEstimates}
			onChange={calculate1559TempGasFee}
			gasFeeNative={EIP1559TransactionData.renderableGasFeeMinNative}
			gasFeeConversion={EIP1559TransactionData.renderableGasFeeMinConversion}
			gasFeeMaxNative={EIP1559TransactionData.renderableGasFeeMaxNative}
			gasFeeMaxConversion={EIP1559TransactionData.renderableGasFeeMaxConversion}
			maxPriorityFeeNative={EIP1559TransactionData.renderableMaxPriorityFeeNative}
			maxPriorityFeeConversion={EIP1559TransactionData.renderableMaxPriorityFeeConversion}
			maxFeePerGasNative={EIP1559TransactionData.renderableMaxFeePerGasNative}
			maxFeePerGasConversion={EIP1559TransactionData.renderableMaxFeePerGasConversion}
			primaryCurrency={primaryCurrency}
			chainId={chainId}
			timeEstimate={EIP1559TransactionData.timeEstimate}
			timeEstimateColor={EIP1559TransactionData.timeEstimateColor}
			timeEstimateId={EIP1559TransactionData.timeEstimateId}
			onCancel={onCancel}
			onSave={() => onSave(EIP1559TransactionData)}
			error={EIP1559TransactionData.error}
			ignoreOptions={
				!gasSelected
					? [AppConstants.GAS_OPTIONS.LOW, AppConstants.GAS_OPTIONS.MEDIUM]
					: [AppConstants.GAS_OPTIONS.LOW]
			}
			//speedUpOption={}
			analyticsParams={getGasAnalyticsParams()}
			view={'Transactions (Speed Up)'}
			animateOnChange={animateOnGasChange}
		/>
	);
};

SpeedUpEIP1559TX.propTypes = {
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: PropTypes.number,
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: PropTypes.string,
	/**
	 * Object containing token exchange rates in the format address => exchangeRate
	 */
	contractExchangeRates: PropTypes.object,
	/**
	 * Chain Id
	 */
	chainId: PropTypes.string,
	/**
	 * ETH or fiat, depending on user setting
	 */
	primaryCurrency: PropTypes.string,
	/**
	 * Gas fee estimates returned by the gas fee controller
	 */
	gasFeeEstimates: PropTypes.object,
	/**
	 * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
	 */
	gasEstimateType: PropTypes.string,
	nativeCurrency: PropTypes.string,
	gas: PropTypes.string,
	onCancel: PropTypes.func,
	onSave: PropTypes.func,
};

const mapStateToProps = (state) => ({
	gasFeeEstimates: state.engine.backgroundState.GasFeeController.gasFeeEstimates,
	gasEstimateType: state.engine.backgroundState.GasFeeController.gasEstimateType,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	primaryCurrency: state.settings.primaryCurrency,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

export default connect(mapStateToProps)(SpeedUpEIP1559TX);
