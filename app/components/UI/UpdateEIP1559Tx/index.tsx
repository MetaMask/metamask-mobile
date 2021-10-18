/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import EditGasFee1559 from '../EditGasFee1559';
import { connect } from 'react-redux';
import { CANCEL_RATE, SPEED_UP_RATE, GAS_ESTIMATE_TYPES } from '@metamask/controllers';
import { hexToBN, fromWei, renderFromWei } from '../../../util/number';
import BigNumber from 'bignumber.js';
import { getTicker, parseTransactionEIP1559 } from '../../../util/transactions';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';

/**
 * View that renders a list of transactions for a specific asset
 */

interface Props {
	/**
	 * Map of accounts to information objects including balances
	 */
	accounts: any;
	/**
	 * ETH to current currency conversion rate
	 */
	conversionRate: number;
	/**
	 * Currency code of the currently-active currency
	 */
	currentCurrency: string;
	/**
	 * Object containing token exchange rates in the format address => exchangeRate
	 */
	contractExchangeRates: any;
	/**
	 * Chain Id
	 */
	chainId: string;
	/**
	 * ETH or fiat, depending on user setting
	 */
	primaryCurrency: string;
	/**
	 * Gas fee estimates returned by the gas fee controller
	 */
	gasFeeEstimates: any;
	/**
	 * Estimate type returned by the gas fee controller, can be market-fee, legacy or eth_gasPrice
	 */
	gasEstimateType: string;
	/**
	 * A string that represents the selected address
	 */
	selectedAddress: string;
	/**
	 * A bool indicates whether tx is speed up/cancel
	 */
	isCancel: boolean;
	/**
	 * Current provider ticker
	 */
	ticker: string;
	/**
	 * The max fee and max priorty fee selected tx
	 */
	existingGas: any;
	/**
	 * Native currency set by user
	 */
	nativeCurrency: string;
	/**
	 * Gas object used to get suggestedGasLimit
	 */
	gas: any;
	/**
	 * Function that cancels the tx update
	 */
	onCancel: () => void;
	/**
	 * Function that performs the rest of the tx update
	 */
	onSave: (tx: any) => void;
}

interface UpdateTx1559Options {
	/**
	 * The legacy calculated max priorty fee used in subcomponent for threshold warning messages
	 */
	maxPriortyFeeThreshold: BigNumber;
	/**
	 * The legacy calculated max fee used in subcomponent for threshold warning messages
	 */
	maxFeeThreshold: BigNumber;
	/**
	 * Boolean to indicate to sumcomponent if the view should display only advanced settings
	 */
	showAdvanced: boolean;
	/**
	 * Boolean to indicate if this is a cancel tx update
	 */
	isCancel: boolean;
}

const UpdateEIP1559Tx = ({
	gas,
	accounts,
	selectedAddress,
	ticker,
	existingGas,
	gasFeeEstimates,
	gasEstimateType,
	contractExchangeRates,
	primaryCurrency,
	currentCurrency,
	nativeCurrency,
	conversionRate,
	isCancel,
	chainId,
	onCancel,
	onSave,
}: Props) => {
	const [EIP1559TransactionData, setEIP1559TransactionData] = useState<any>({});
	const [animateOnGasChange, setAnimateOnGasChange] = useState(false);
	const [gasSelected, setGasSelected] = useState(AppConstants.GAS_OPTIONS.MEDIUM);
	const stopUpdateGas = useRef(false);
	/**
	 * Flag to only display high gas selection option if the legacy is higher then low/med
	 */
	const onlyDisplayHigh = useRef(false);
	/**
	 * Options
	 */
	const updateTx1559Options = useRef<UpdateTx1559Options | undefined>();
	const pollToken = useRef(undefined);
	const firstTime = useRef(true);

	useEffect(() => {
		if (animateOnGasChange) setAnimateOnGasChange(false);
	}, [animateOnGasChange]);

	useEffect(() => {
		const { GasFeeController }: any = Engine.context;
		const startGasEstimatePolling = async () => {
			pollToken.current = await GasFeeController.getGasFeeEstimatesAndStartPolling(pollToken.current);
		};

		startGasEstimatePolling();

		return () => {
			GasFeeController.stopPolling(pollToken.current);
		};
	}, []);

	const isMaxFeePerGasMoreThanLegacy = useCallback(
		(maxFeePerGas: BigNumber) => {
			const newDecMaxFeePerGas = new BigNumber(existingGas.maxFeePerGas).times(
				new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE)
			);
			return { result: maxFeePerGas.gte(newDecMaxFeePerGas), value: newDecMaxFeePerGas };
		},
		[existingGas.maxFeePerGas, isCancel]
	);

	const isMaxPriorityFeePerGasMoreThanLegacy = useCallback(
		(maxPriorityFeePerGas: BigNumber) => {
			const newDecMaxPriorityFeePerGas = new BigNumber(existingGas.maxPriorityFeePerGas).times(
				new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE)
			);
			return { result: maxPriorityFeePerGas.gte(newDecMaxPriorityFeePerGas), value: newDecMaxPriorityFeePerGas };
		},
		[existingGas.maxPriorityFeePerGas, isCancel]
	);

	const validateAmount = useCallback(
		(updateTx) => {
			let error;

			const updateTxCost: any = hexToBN(`0x${updateTx.totalMaxHex}`);
			const accountBalance: any = hexToBN(accounts[selectedAddress].balance);
			const isMaxFeePerGasMoreThanLegacyResult = isMaxFeePerGasMoreThanLegacy(
				new BigNumber(updateTx.suggestedMaxFeePerGas)
			);
			const isMaxPriorityFeePerGasMoreThanLegacyResult = isMaxPriorityFeePerGasMoreThanLegacy(
				new BigNumber(updateTx.suggestedMaxPriorityFeePerGas)
			);
			if (accountBalance.lt(updateTxCost)) {
				const amount = renderFromWei(updateTxCost.sub(accountBalance));
				const tokenSymbol = getTicker(ticker);
				error = strings('transaction.insufficient_amount', { amount, tokenSymbol });
			} else if (!isMaxFeePerGasMoreThanLegacyResult.result) {
				error = isCancel
					? strings('edit_gas_fee_eip1559.max_fee_cancel_low', {
							cancel_value: isMaxFeePerGasMoreThanLegacyResult.value,
					  })
					: strings('edit_gas_fee_eip1559.max_fee_speed_up_low', {
							speed_up_floor_value: isMaxFeePerGasMoreThanLegacyResult.value,
					  });
			} else if (!isMaxPriorityFeePerGasMoreThanLegacyResult.result) {
				error = isCancel
					? strings('edit_gas_fee_eip1559.max_priority_fee_cancel_low', {
							cancel_value: isMaxPriorityFeePerGasMoreThanLegacyResult.value,
					  })
					: strings('edit_gas_fee_eip1559.max_priority_fee_speed_up_low', {
							speed_up_floor_value: isMaxPriorityFeePerGasMoreThanLegacyResult.value,
					  });
			}

			return error;
		},
		[
			accounts,
			selectedAddress,
			isMaxFeePerGasMoreThanLegacy,
			isMaxPriorityFeePerGasMoreThanLegacy,
			ticker,
			isCancel,
		]
	);

	const parseTransactionDataEIP1559 = useCallback(
		(gasFee) => {
			const parsedTransactionEIP1559: any = parseTransactionEIP1559(
				{
					contractExchangeRates,
					swapsParams: undefined,
					conversionRate,
					currentCurrency,
					nativeCurrency,
					selectedGasFee: { ...gasFee, estimatedBaseFee: gasFeeEstimates.estimatedBaseFee },
					gasFeeEstimates,
				},
				{ onlyGas: true }
			);

			parsedTransactionEIP1559.error = validateAmount(parsedTransactionEIP1559);

			return parsedTransactionEIP1559;
		},
		[contractExchangeRates, conversionRate, currentCurrency, gasFeeEstimates, nativeCurrency, validateAmount]
	);

	useEffect(() => {
		if (stopUpdateGas.current) return;
		if (gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET) {
			const suggestedGasLimit = fromWei(gas, 'wei');

			let updateTxEstimates = gasFeeEstimates[gasSelected];

			if (firstTime.current) {
				const newDecMaxFeePerGas = new BigNumber(existingGas.maxFeePerGas).times(
					new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE)
				);
				const newDecMaxPriorityFeePerGas = new BigNumber(existingGas.maxPriorityFeePerGas).times(
					new BigNumber(isCancel ? CANCEL_RATE : SPEED_UP_RATE)
				);

				//Check to see if default SPEED_UP_RATE/CANCEL_RATE is greater than current market medium value
				if (
					!isMaxFeePerGasMoreThanLegacy(new BigNumber(gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas))
						.result ||
					!isMaxPriorityFeePerGasMoreThanLegacy(new BigNumber(gasFeeEstimates.medium.suggestedMaxFeePerGas))
						.result
				) {
					updateTx1559Options.current = {
						maxPriortyFeeThreshold: newDecMaxPriorityFeePerGas,
						maxFeeThreshold: newDecMaxFeePerGas,
						showAdvanced: true,
						isCancel,
					};

					updateTxEstimates = {
						selectedOption: undefined,
						suggestedMaxFeePerGas: newDecMaxFeePerGas,
						suggestedMaxPriorityFeePerGas: newDecMaxPriorityFeePerGas,
					};

					onlyDisplayHigh.current = true;
					//Disable polling
					stopUpdateGas.current = true;
					setGasSelected('');
				} else {
					updateTx1559Options.current = {
						maxPriortyFeeThreshold: gasFeeEstimates.medium.suggestedMaxPriorityFeePerGas,
						maxFeeThreshold: gasFeeEstimates.medium.suggestedMaxFeePerGas,
						showAdvanced: false,
						isCancel,
					};
					setAnimateOnGasChange(true);
				}
			}

			const parsedTransactionEIP1559: any = parseTransactionDataEIP1559({
				...updateTxEstimates,
				suggestedGasLimit,
				selectedOption: gasSelected,
			});

			firstTime.current = false;

			setEIP1559TransactionData(parsedTransactionEIP1559);
		}
	}, [
		existingGas.maxFeePerGas,
		existingGas.maxPriorityFeePerGas,
		gasEstimateType,
		gasFeeEstimates,
		gasSelected,
		parseTransactionDataEIP1559,
		isCancel,
		gas,
		isMaxFeePerGasMoreThanLegacy,
		isMaxPriorityFeePerGasMoreThanLegacy,
	]);

	const calculate1559TempGasFee = (gasValues: any, selected: string) => {
		if (selected && gas) {
			gasValues.suggestedGasLimit = fromWei(gas, 'wei');
		}
		setEIP1559TransactionData(parseTransactionDataEIP1559({ ...gasValues, selectedOption: selected }));
		stopUpdateGas.current = !selected;
		setGasSelected(selected);
	};

	const getGasAnalyticsParams = () => ({
		chain_id: chainId,
		gas_estimate_type: gasEstimateType,
		gas_mode: gasSelected ? 'Basic' : 'Advanced',
		speed_set: gasSelected || undefined,
	});

	return (
		<EditGasFee1559
			selected={gasSelected}
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
				onlyDisplayHigh.current
					? [AppConstants.GAS_OPTIONS.LOW, AppConstants.GAS_OPTIONS.MEDIUM]
					: [AppConstants.GAS_OPTIONS.LOW]
			}
			updateOption={updateTx1559Options.current}
			analyticsParams={getGasAnalyticsParams()}
			view={isCancel ? 'Transactions (Cancel)' : 'Transactions (Speed Up)'}
			animateOnChange={animateOnGasChange}
		/>
	);
};

const mapStateToProps = (state: any) => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	gasFeeEstimates: state.engine.backgroundState.GasFeeController.gasFeeEstimates,
	gasEstimateType: state.engine.backgroundState.GasFeeController.gasEstimateType,
	contractExchangeRates: state.engine.backgroundState.TokenRatesController.contractExchangeRates,
	currentCurrency: state.engine.backgroundState.CurrencyRateController.currentCurrency,
	nativeCurrency: state.engine.backgroundState.CurrencyRateController.nativeCurrency,
	conversionRate: state.engine.backgroundState.CurrencyRateController.conversionRate,
	primaryCurrency: state.settings.primaryCurrency,
	chainId: state.engine.backgroundState.NetworkController.provider.chainId,
});

export default connect(mapStateToProps)(UpdateEIP1559Tx);
