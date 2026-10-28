import { useSelector } from 'react-redux';
import { NATIVE_ADDRESS } from '../../../../../constants/on-ramp';
import { RootState } from '../../../../../reducers';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import {
  selectAllTokenBalances,
  selectContractBalancesPerChainId,
} from '../../../../../selectors/tokenBalancesController';
import { selectContractExchangeRatesByChainId } from '../../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../../util/address';
import {
  balanceToFiat,
  hexToBigInt,
  renderFromTokenMinimalUnit,
  renderFromWei,
  toTokenMinimalUnit,
  weiToFiat,
} from '../../../../../util/number/bigint';
import { CaipChainId, Hex, isCaipChainId } from '@metamask/utils';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { EthScope, isEvmAccountType } from '@metamask/keyring-api';
import { getEvmHexChainId } from '../utils';
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
  decimals?: number;
  chainId?: string;
  assetId?: string;
}

/**
 * Resolves the account scope to look the holding account up by.
 *
 * The scope selector matches any `eip155:*` scope to the account group's EVM
 * account, so the EVM wildcard is enough for EVM assets. Non-EVM assets need
 * their own CAIP chain id.
 *
 * @param chainId - Chain id from the selected ramp asset.
 * @param assetEvmChainId - EVM hex chain id resolved from `chainId`, if any.
 * @returns CAIP chain id to look the account up by, or undefined.
 */
function toAccountScope(
  chainId?: string,
  assetEvmChainId?: Hex,
): CaipChainId | undefined {
  if (assetEvmChainId) {
    return EthScope.Eoa;
  }

  if (!chainId || !isCaipChainId(chainId)) {
    return undefined;
  }

  return chainId;
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

  // Conversion and exchange rates must be read for the asset's own chain, not
  // the globally selected network, otherwise the fiat balance is computed with
  // the wrong native-currency rate (e.g. an ETH rate applied to a BNB balance).
  const assetEvmChainId = getEvmHexChainId(asset?.chainId);
  const conversionRate = useSelector((state: RootState) =>
    assetEvmChainId
      ? selectConversionRateByChainId(state, assetEvmChainId)
      : undefined,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const tokenExchangeRates = useSelector((state: RootState) =>
    assetEvmChainId
      ? selectContractExchangeRatesByChainId(state, assetEvmChainId)
      : undefined,
  );
  const balancesPerChainId = useSelector(selectContractBalancesPerChainId);
  const allTokenBalances = useSelector(selectAllTokenBalances);

  if (!asset || (!asset.address && !asset.assetId) || !selectedAddress) {
    return defaultReturn;
  }

  // The globally selected account can be a Solana/BTC sibling in the same
  // account group. Sell must read the account that holds this asset.
  const accountScope = toAccountScope(asset.chainId, assetEvmChainId);
  const accountForAsset =
    accountScope && typeof selectInternalAccountByScope === 'function'
      ? selectInternalAccountByScope(accountScope)
      : undefined;
  const evmAccountForAsset =
    accountForAsset && isEvmAccountType(accountForAsset.type)
      ? accountForAsset
      : undefined;
  const evmLookupAddress = evmAccountForAsset
    ? toChecksumHexAddress(evmAccountForAsset.address)
    : selectedAddress;
  const tokenBalancesByChain = evmAccountForAsset
    ? (allTokenBalances?.[evmAccountForAsset.address as Hex] ?? {})
    : balancesPerChainId;

  let balance, balanceFiat, balanceBN;

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  if (asset.assetId) {
    const isEvmAsset = Boolean(assetEvmChainId);

    if (!accountForAsset && !isEvmAsset) {
      return defaultReturn;
    }

    // EVM balances are not in the multichain balance map. Leave `balance`
    // unset so the EVM branches below read the scoped account.
    if (accountForAsset && !isEvmAsset) {
      const assetCaip19Identifier = `${asset.chainId}/${asset.assetId}`;
      const assetBalance =
        multiChainTokenBalance?.[accountForAsset.id]?.[assetCaip19Identifier];
      balance = `${assetBalance?.amount ?? ''} ${
        assetBalance?.unit ?? ''
      }`.trim();

      // Non-EVM balances arrive as a decimal string. Convert to minimal units so
      // the entered amount (also in minimal units, via toTokenMinimalUnit) can be
      // compared against it.
      if (assetBalance?.amount != null && assetBalance.amount !== '') {
        // Decimals are chain-specific (SOL 9, TRX 6, XLM 7). Guessing a fallback
        // could produce a dangerously incorrect available balance.
        if (asset.decimals == null) {
          return { balance, balanceFiat, balanceBN: null };
        }

        try {
          balanceBN = toTokenMinimalUnit(assetBalance.amount, asset.decimals);
        } catch {
          balanceBN = null;
        }
        return { balance, balanceFiat, balanceBN };
      }
    }
  }

  ///: END:ONLY_INCLUDE_IF
  if (!balance && asset.address === NATIVE_ADDRESS && assetEvmChainId) {
    const hexChainId = assetEvmChainId;
    // Chain id should exist in accountsByChainId in AccountTrackerController at this point in time
    if (!accountsByChainId[hexChainId]) {
      return defaultReturn;
    }

    const accountBalance =
      accountsByChainId[hexChainId][evmLookupAddress]?.balance;

    balance = renderFromWei(accountBalance);

    // Legacy hexToBN(undefined) returned BN(0); preserve that for missing balances.
    balanceBN = hexToBigInt(accountBalance ?? '0x0');

    balanceFiat = weiToFiat(balanceBN, conversionRate ?? null, currentCurrency);
  } else if (asset.address) {
    const assetAddress = safeToChecksumAddress(asset.address);
    const exchangeRate = tokenExchangeRates?.[assetAddress as Hex]?.price;
    // Use the asset's chainId to get balances for the correct chain
    const hexChainId = assetEvmChainId;
    const chainBalances = hexChainId ? tokenBalancesByChain[hexChainId] : {};
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
        ? hexToBigInt(chainBalances[assetAddress])
        : null;
  }

  return { balance, balanceFiat, balanceBN };
}
