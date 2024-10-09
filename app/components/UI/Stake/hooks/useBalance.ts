import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectChainId } from '../../../../selectors/networkController';
import {
  hexToBN,
  renderFromWei,
  toHexadecimal,
  weiToFiat,
  weiToFiatNumber,
} from '../../../../util/number';

const useBalance = () => {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const chainId = useSelector(selectChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  const conversionRate = useSelector(selectConversionRate) ?? 1;
  const currentCurrency = useSelector(selectCurrentCurrency);

  const rawAccountBalance = selectedAddress
    ? accountsByChainId[toHexadecimal(chainId)]?.[selectedAddress]?.balance
    : '0';

  const balance = useMemo(
    () => renderFromWei(rawAccountBalance),
    [rawAccountBalance],
  );

  const balanceWei = useMemo(
    () => hexToBN(rawAccountBalance),
    [rawAccountBalance],
  );

  const balanceFiat = useMemo(
    () => weiToFiat(balanceWei, conversionRate, currentCurrency),
    [balanceWei, conversionRate, currentCurrency],
  );

  const balanceFiatNumber = useMemo(
    () => weiToFiatNumber(balanceWei, conversionRate, 2),
    [balanceWei, conversionRate],
  );

  return { balance, balanceFiat, balanceWei, balanceFiatNumber };
};

export default useBalance;
