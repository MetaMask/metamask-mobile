import { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { swapsUtils } from '@estebanmino/controllers';
import { strings } from '../../../../../locales/i18n';

/**
 * Sets required parameters for Swaps Quotes View
 * @param {string} sourceTokenAddress Token contract address used as swaps source
 * @param {string} destinationTokenAddress Token contract address used as swaps result
 * @param {string} sourceAmount Amount in minimal token units of sourceTokenAddress to be swapped
 * @param {string|number} slippage Max slippage
 * @return {object} Object containing sourceTokenAddress, destinationTokenAddress, sourceAmount and slippage
 */
export function setQuotesNavigationsParams(sourceTokenAddress, destinationTokenAddress, sourceAmount, slippage) {
	return {
		sourceTokenAddress,
		destinationTokenAddress,
		sourceAmount,
		slippage
	};
}

/**
 * Gets required parameters for Swaps Quotes View
 * @param {object} navigation React-navigation's navigation prop
 * @return {object} Object containing sourceTokenAddress, destinationTokenAddress, sourceAmount and slippage
 */
export function getQuotesNavigationsParams(navigation) {
	const slippage = navigation.getParam('slippage', 1);
	const sourceTokenAddress = navigation.getParam('sourceTokenAddress', '');
	const destinationTokenAddress = navigation.getParam('destinationTokenAddress', '');
	const sourceAmount = navigation.getParam('sourceAmount');

	return {
		sourceTokenAddress,
		destinationTokenAddress,
		sourceAmount,
		slippage
	};
}

/**
 * Returns object required to startFetchAndSetQuotes
 * @param {object} options
 * @param {string|number} options.slippage
 * @param {object} options.sourceToken sourceToken object from tokens API
 * @param {object} options.destinationToken destinationToken object from tokens API
 * @param {string} sourceAmount Amount in minimal token units of sourceToken to be swapped
 * @param {string} fromAddress Current address attempting to swap
 */
export function getFetchParams({
	slippage = 1,
	sourceToken,
	destinationToken,
	sourceAmount,
	fromAddress,
	destinationTokenConversionRate
}) {
	return {
		slippage,
		sourceToken: sourceToken.address,
		destinationToken: destinationToken.address,
		sourceAmount,
		fromAddress,
		balanceError: undefined,
		metaData: {
			sourceTokenInfo: sourceToken,
			destinationTokenInfo: destinationToken,
			accountBalance: '0x0',
			destinationTokenConversionRate
		}
	};
}

export function useRatio(numeratorAmount, numeratorDecimals, denominatorAmount, denominatorDecimals) {
	const ratio = useMemo(
		() =>
			new BigNumber(numeratorAmount)
				.dividedBy(denominatorAmount)
				.multipliedBy(new BigNumber(10).pow(denominatorDecimals - numeratorDecimals)),
		[denominatorAmount, denominatorDecimals, numeratorAmount, numeratorDecimals]
	);

	return ratio;
}

export function getErrorMessage(errorKey) {
	const { SwapsError } = swapsUtils;
	const errorAction =
		errorKey === SwapsError.QUOTES_EXPIRED_ERROR ? strings('swaps.get_new_quotes') : strings('swaps.try_again');
	switch (errorKey) {
		case SwapsError.QUOTES_EXPIRED_ERROR: {
			return [strings('swaps.quotes_timeout'), strings('swaps.request_new_quotes'), errorAction];
		}
		case SwapsError.QUOTES_NOT_AVAILABLE_ERROR: {
			return [strings('swaps.quotes_not_available'), strings('swaps.try_adjusting'), errorAction];
		}
		default: {
			return [
				strings('swaps.error_fetching_quote'),
				strings('swaps.unexpected_error', { error: errorKey }),
				errorAction
			];
		}
	}
}
