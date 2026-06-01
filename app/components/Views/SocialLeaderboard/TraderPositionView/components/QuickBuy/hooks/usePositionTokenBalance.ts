import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatUnits } from 'ethers/lib/utils';
import {
  isSolanaChainId,
  isNonEvmChainId,
  formatChainIdToHex,
} from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
import type { Hex, CaipChainId } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../../reducers';
import { selectAccountsByChainId } from '../../../../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { selectTokensBalances } from '../../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../../../selectors/currencyRateController';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
} from '../../../../../../../selectors/multichain/multichain';
import { toChecksumAddress } from '../../../../../../../util/address';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import { chainNameToId } from '../../../../utils/chainMapping';
import type { QuickBuyTarget } from '../types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const isNativeToken = (address: string): boolean =>
  address.toLowerCase() === ZERO_ADDRESS;

const isZeroHexBalance = (balance?: string): boolean =>
  !balance || balance === '0x0' || balance === '0x00';

const hasNonZeroHexBalance = (balance?: string): balance is string =>
  !isZeroHexBalance(balance);

type TokenBalances = ReturnType<typeof selectTokensBalances>;
type AccountsByChainId = ReturnType<typeof selectAccountsByChainId>;

const getAddressLookupKeys = (address?: string): Hex[] => {
  if (!address) return [];
  const keys = new Set<Hex>([address as Hex, address.toLowerCase() as Hex]);
  try {
    keys.add(toChecksumAddress(address) as Hex);
  } catch {
    // ignore
  }
  return [...keys];
};

const getCachedNativeBalance = (
  accountsByChainId: AccountsByChainId,
  chainId: Hex,
  accountAddress?: string,
): string | undefined => {
  for (const key of getAddressLookupKeys(accountAddress)) {
    const balance = accountsByChainId?.[chainId]?.[key]?.balance;
    if (balance) return balance;
  }
  return undefined;
};

const getCachedErc20Balance = (
  tokenBalances: TokenBalances,
  accountAddress: string | undefined,
  chainId: Hex,
  tokenAddress: string,
): string | undefined => {
  for (const accountKey of getAddressLookupKeys(accountAddress)) {
    const chainBalances = tokenBalances?.[accountKey]?.[chainId];
    if (!chainBalances) continue;
    for (const tokenKey of getAddressLookupKeys(tokenAddress)) {
      const balance = chainBalances[tokenKey];
      if (balance) return balance;
    }
  }
  return undefined;
};

/**
 * Resolves the current user's balance of the position token (i.e. the token
 * that would be *sold* in Sell mode). Returns a `BridgeToken` enriched with
 * balance / fiatValue, or `undefined` when the balance is zero or loading.
 *
 * Mirrors the per-token logic in `useSourceTokenOptions`.
 */
export const usePositionTokenBalance = (
  target: QuickBuyTarget | null,
  destToken: BridgeToken | undefined,
): BridgeToken | undefined => {
  const accountAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);

  const solanaAccount = useSelector((state: RootState) =>
    selectSelectedInternalAccountByScope(state)(SolScope.Mainnet),
  );
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainRates = useSelector(selectMultichainAssetsRates);

  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  return useMemo((): BridgeToken | undefined => {
    if (!target || !destToken) return undefined;

    const caipChainId = chainNameToId(target.chain) as
      | CaipChainId
      | Hex
      | undefined;
    if (!caipChainId) return undefined;

    // ─── Solana branch ─────────────────────────────────────────────────
    if (isNonEvmChainId(caipChainId) && isSolanaChainId(caipChainId)) {
      if (!solanaAccount) return undefined;
      const balanceEntry =
        multichainBalances?.[solanaAccount.id]?.[destToken.address];
      const amountStr = balanceEntry?.amount;
      if (!amountStr) return undefined;
      const balanceNum = parseFloat(amountStr);
      if (isNaN(balanceNum) || balanceNum <= 0) return undefined;

      const rateStr = (
        multichainRates as Record<string, { rate?: string } | undefined>
      )?.[destToken.address]?.rate;
      const rateNum = rateStr ? parseFloat(rateStr) : NaN;
      if (isNaN(rateNum) || rateNum <= 0) return undefined;

      const fiatValue = balanceNum * rateNum;
      return {
        ...destToken,
        balance: amountStr,
        balanceFiat: `$${fiatValue.toFixed(2)}`,
        tokenFiatAmount: fiatValue,
        currencyExchangeRate: rateNum,
      };
    }

    // ─── EVM branch ────────────────────────────────────────────────────
    if (!accountAddress) return undefined;
    const hexChainId = formatChainIdToHex(caipChainId as CaipChainId) as Hex;

    let rawBalance: string | undefined;
    if (isNativeToken(target.tokenAddress)) {
      rawBalance = getCachedNativeBalance(
        accountsByChainId,
        hexChainId,
        accountAddress,
      );
    } else {
      rawBalance = getCachedErc20Balance(
        tokenBalances,
        accountAddress,
        hexChainId,
        target.tokenAddress,
      );
    }

    if (!hasNonZeroHexBalance(rawBalance)) return undefined;

    let displayBalance: string;
    try {
      displayBalance = formatUnits(rawBalance, destToken.decimals);
    } catch {
      return undefined;
    }

    const balanceNum = parseFloat(displayBalance);
    if (isNaN(balanceNum) || balanceNum <= 0) return undefined;

    const networkConfig = allNetworkConfigs?.[hexChainId];
    const nativeTicker = networkConfig?.nativeCurrency;
    const nativeConversionRate = nativeTicker
      ? (currencyRates?.[nativeTicker]?.usdConversionRate ?? 0)
      : 0;

    let exchangeRate: number;
    let fiatValue: number;

    if (isNativeToken(target.tokenAddress)) {
      exchangeRate = nativeConversionRate;
      if (exchangeRate <= 0) return undefined;
      fiatValue = balanceNum * exchangeRate;
    } else {
      const tokenPrice =
        tokenMarketData?.[hexChainId]?.[target.tokenAddress.toLowerCase()]
          ?.price ??
        tokenMarketData?.[hexChainId]?.[target.tokenAddress]?.price;
      if (tokenPrice !== undefined) {
        if (nativeConversionRate <= 0) return undefined;
        exchangeRate = tokenPrice * nativeConversionRate;
      } else {
        exchangeRate = 1.0;
      }
      if (exchangeRate <= 0) return undefined;
      fiatValue = balanceNum * exchangeRate;
    }

    return {
      ...destToken,
      balance: displayBalance,
      balanceFiat: `$${fiatValue.toFixed(2)}`,
      tokenFiatAmount: fiatValue,
      currencyExchangeRate: exchangeRate,
    };
  }, [
    target,
    destToken,
    accountAddress,
    solanaAccount,
    multichainBalances,
    multichainRates,
    accountsByChainId,
    tokenBalances,
    tokenMarketData,
    currencyRates,
    allNetworkConfigs,
  ]);
};
