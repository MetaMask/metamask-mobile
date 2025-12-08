import { useSelector } from 'react-redux';
import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectContractBalancesPerChainId } from '../../../../../selectors/tokenBalancesController';
import { selectContractExchangeRates } from '../../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../../util/address';
import {
  balanceToFiat,
  hexToBN,
  renderFromTokenMinimalUnit,
  renderFromWei,
  weiToFiat,
} from '../../../../../util/number';
import { CaipChainId, Hex } from '@metamask/utils';
import { toHex } from '@metamask/controller-utils';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainBalances } from '../../../../../selectors/multichain';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
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
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const selectInternalAccountByScope = useSelector(
    selectSelectedInternalAccountByScope,
  );

  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const tokenExchangeRates = useSelector(selectContractExchangeRates);
  const balancesPerChainId = useSelector(selectContractBalancesPerChainId);

  if (!asset || (!asset.address && !asset.assetId) || !selectedAddress) {
    return defaultReturn;
  }

  let balance, balanceFiat, balanceBN;

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (asset.assetId) {
    const selectedAccount = selectInternalAccountByScope(
      asset.chainId as CaipChainId,
    );

    if (!selectedAccount) {
      return defaultReturn;
    }

    // CAIP19 asset identifier
    const assetCaip19Identifier = `${asset.chainId}/${asset.assetId}`;
    const assetBalance =
      multiChainTokenBalance?.[selectedAccount.id]?.[assetCaip19Identifier];
    balance = `${assetBalance?.amount ?? ''} ${
      assetBalance?.unit ?? ''
    }`.trim();
  }

  ///: END:ONLY_INCLUDE_IF
  if (!balance && asset.address === NATIVE_ADDRESS && asset.chainId) {
    const hexChainId = toHex(asset.chainId);
    // Chain id should exist in accountsByChainId in AccountTrackerController at this point in time
    if (!accountsByChainId[hexChainId]) {
      return defaultReturn;
    }

    balance = renderFromWei(
      accountsByChainId[hexChainId][selectedAddress]?.balance,
    );

    balanceBN = hexToBN(
      accountsByChainId[hexChainId][selectedAddress]?.balance,
    );

    balanceFiat = weiToFiat(balanceBN, conversionRate, currentCurrency);
  } else if (asset.address) {
    const assetAddress = safeToChecksumAddress(asset.address);
    const exchangeRate = tokenExchangeRates?.[assetAddress as Hex]?.price;
    // Use the asset's chainId to get balances for the correct chain
    const hexChainId = asset.chainId ? toHex(asset.chainId) : undefined;
    const chainBalances = hexChainId ? balancesPerChainId[hexChainId] : {};
    balance =
      assetAddress && chainBalances && assetAddress in chainBalances
        ? renderFromTokenMinimalUnit(
            chainBalances[assetAddress],
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
      assetAddress && chainBalances && assetAddress in chainBalances
        ? hexToBN(chainBalances[assetAddress])
        : null;
  }

  return { balance, balanceFiat, balanceBN };
}
