import { useSelector } from 'react-redux';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectSelectedInternalAccountChecksummedAddress } from '../../../../selectors/accountsController';
import { selectContractBalances } from '../../../../selectors/tokenBalancesController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectChainId } from '../../../../selectors/networkController';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  balanceToFiat,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  toHexadecimal,
  weiToFiat,
} from '../../../../util/number';

const defaultReturn = {
  balance: null,
  balanceFiat: null,
  balanceMinimalUnit: null,
};

interface Asset {
  address: string;
  decimals: number;
}

export default function useBalance(asset?: Asset): {
  balance: string|null,
  balanceFiat: string|null,
  balanceMinimalUnit: string|null,
}{
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const chainId = useSelector(selectChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountChecksummedAddress,
  );
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const balances = useSelector(selectContractBalances);

  if (!asset) {
    return defaultReturn;
  }

  const assetAddress = safeToChecksumAddress(asset.address);

  if (!assetAddress) {
    return defaultReturn;
  }

  if (assetAddress === NATIVE_ADDRESS) {
    //@ts-expect-error - TODO: Ramps team
    const balanceMinimalUnit = accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance;
    const balance = renderFromWei(balanceMinimalUnit);

    const balanceBN = hexToBN(balance);
    const balanceFiat = weiToFiat(balanceBN, conversionRate, currentCurrency);
    return { balance, balanceFiat, balanceMinimalUnit };
  }

  const exchangeRate = tokenExchangeRates?.[assetAddress]?.price;
  const balanceMinimalUnit =
    assetAddress && assetAddress in balances
      ? balances[assetAddress]
      : '0';
  const balance =
    assetAddress && assetAddress in balances
      ? renderFromTokenMinimalUnit(
          balances[assetAddress],
          asset.decimals ?? 18,
        )
      : '0';
  const balanceFiat = balanceToFiat(
    balance,
    conversionRate,
    exchangeRate,
    currentCurrency,
  );
  return { balance, balanceFiat, balanceMinimalUnit };
}
