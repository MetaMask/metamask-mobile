import { useSelector } from 'react-redux';
import { NATIVE_ADDRESS } from '../../../../constants/on-ramp';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountFormattedAddress,
} from '../../../../selectors/accountsController';
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
import { Hex } from '@metamask/utils';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainBalances } from '../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF

const defaultReturn = {
  balance: null,
  balanceFiat: null,
  balanceBN: null,
};

interface Asset {
  address?: string;
  decimals: number;
  chainId?: string;
  assetId?: string;
}

export default function useBalance(asset?: Asset) {
  const accountsByChainId = useSelector(selectAccountsByChainId);
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multiChainTokenBalance = useSelector(selectMultichainBalances);
  ///: END:ONLY_INCLUDE_IF
  const chainId = useSelector(selectEvmChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const balances = useSelector(selectContractBalances);

  if (
    !asset ||
    (!asset.address && !asset.assetId) ||
    !selectedAddress ||
    !selectedAccount
  ) {
    return defaultReturn;
  }

  let balance, balanceFiat, balanceBN;

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (asset.assetId) {
    // CAIP19 asset identifier
    const assetCaip19Identifier = `${asset.chainId}/${asset.assetId}`;
    const assetBalance =
      multiChainTokenBalance?.[selectedAccount.id]?.[assetCaip19Identifier];
    balance = `${assetBalance?.amount ?? ''} ${
      assetBalance?.unit ?? ''
    }`.trim();
  }
  ///: END:ONLY_INCLUDE_IF
  if (!balance && asset.address === NATIVE_ADDRESS) {
    // Chain id should exist in accountsByChainId in AccountTrackerController at this point in time
    if (!accountsByChainId[toHexadecimal(chainId)]) {
      return defaultReturn;
    }

    balance = renderFromWei(
      accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
    );

    balanceBN = hexToBN(
      accountsByChainId[toHexadecimal(chainId)][selectedAddress]?.balance,
    );

    balanceFiat = weiToFiat(balanceBN, conversionRate, currentCurrency);
  } else if (asset.address) {
    const assetAddress = safeToChecksumAddress(asset.address);
    const exchangeRate = tokenExchangeRates?.[assetAddress as Hex]?.price;
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
