import { useMemo } from 'react';
import { formatNetworkFee } from '../../utils/formatNetworkFee';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import { useIsHardwareWalletForBridge } from '../useIsHardwareWalletForBridge';

export const useFormattedNetworkFee = (
  quote?: (QuoteMetadata & QuoteResponse) | null,
) => {
  const currency = useSelector(selectCurrentCurrency);
  const isHardwareWallet = useIsHardwareWalletForBridge();
  const networkFee = useMemo(
    () =>
      formatNetworkFee(currency, quote, {
        treatAsNotGasless: isHardwareWallet,
      }),
    [quote, currency, isHardwareWallet],
  );
  return networkFee;
};
