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
};

interface Asset {
  address: string;
  decimals: number;
}

export default function useBalance(asset?: Asset): {
  balance: string|null,
  balanceFiat: string|null,
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
    const balance = renderFromWei(
      //@ts-expect-error - TODO: Ramps team
      accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
    );

    const balanceBN = hexToBN(
      //@ts-expect-error - TODO: Ramps team
      accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
    );
    const balanceFiat = weiToFiat(balanceBN, conversionRate, currentCurrency);
    return { balance, balanceFiat };
  }

  const exchangeRate = tokenExchangeRates?.[assetAddress]?.price;
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
  return { balance, balanceFiat };
}
