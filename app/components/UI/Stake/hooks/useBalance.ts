import { hexToBN } from '@metamask/controller-utils';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectChainId } from '../../../../selectors/networkController';
import {
  renderFromWei,
  toHexadecimal,
  weiToFiat,
} from '../../../../util/number';

const defaultReturn = {
  balance: null,
  balanceFiat: null,
  balanceBN: null,
};

export default function useBalance() {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const chainId = useSelector(selectChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);

  if (!selectedAddress) {
    return defaultReturn;
  }

  const balance = renderFromWei(
    accountsByChainId[toHexadecimal(chainId)][selectedAddress].balance,
  );

  const balanceBN = hexToBN(
    accountsByChainId[toHexadecimal(chainId)][selectedAddress].balance,
  );
  const balanceFiat = weiToFiat(balanceBN, conversionRate, currentCurrency);

  return { balance, balanceFiat, balanceBN };
}
