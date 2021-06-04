import { useMemo } from 'react';
import { CURRENCIES } from './constants';

function useCurrency(currency) {
	const currencyData = useMemo(() => {
		if (!currency || !CURRENCIES[currency?.toUpperCase()]) {
			return CURRENCIES.default;
		}

		return CURRENCIES[currency.toUpperCase()];
	}, [currency]);

	const handler = currencyData.handler;
	const symbol = currencyData.symbol;
	const decimalSeparator = currencyData.decimalSeparator;

	return { handler, symbol, decimalSeparator };
}

export default useCurrency;
