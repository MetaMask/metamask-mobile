import { useSelector } from 'react-redux';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { selectContractBalances } from '../../../../selectors/tokenBalancesController';
import { selectContractExchangeRates } from '../../../../selectors/tokenRatesController';
import { selectEvmChainId } from '../../../../selectors/networkController';
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
  balanceBN: null,
};

interface Asset {
  address: string;
  decimals: number;
}

export default function useBalance(asset?: Asset) {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const chainId = useSelector(selectEvmChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
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

  let balance, balanceFiat, balanceBN;
  if (assetAddress === NATIVE_ADDRESS) {
    // Chain id should exist in accountsByChainId in AccountTrackerController at this point in time
    if (!accountsByChainId[toHexadecimal(chainId)]) {
      return defaultReturn;
    }

    balance = renderFromWei(
      //@ts-expect-error - TODO: Ramps team
      accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
    );

    balanceBN = hexToBN(
      //@ts-expect-error - TODO: Ramps team
      accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
    );

    balanceFiat = weiToFiat(balanceBN, conversionRate, currentCurrency);
  } else {
    const exchangeRate = tokenExchangeRates?.[assetAddress]?.price;
    balance =
      assetAddress && assetAddress in balances
        ? renderFromTokenMinimalUnit(
            balances[assetAddress],
            asset.decimals ?? 18,
          )
        : 0;
    balanceFiat = balanceToFiat(
      balance,
      conversionRate,
      exchangeRate,
      currentCurrency,
    );
    balanceBN =
      assetAddress && assetAddress in balances
        ? hexToBN(balances[assetAddress])
        : null;
  }

  return { balance, balanceFiat, balanceBN };
}
