import { useMemo } from 'react';
import { formatNetworkFee } from '../../utils/formatNetworkFee';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { QuoteResponse } from '@metamask/bridge-controller';

export const useFormattedNetworkFee = (quote?: QuoteResponse | null) => {
  const currency = useSelector(selectCurrentCurrency);
  const networkFee = useMemo(
    () => formatNetworkFee(currency, quote),
    [quote, currency],
  );
  return networkFee;
};
