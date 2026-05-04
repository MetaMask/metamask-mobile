import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { formatUnits } from 'ethers/lib/utils';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../reducers';
import { selectAccountsByChainId } from '../../../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { selectTokensBalances } from '../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../../selectors/currencyRateController';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
} from '../../../../../../selectors/multichain/multichain';
import { getSourceTokenCandidates } from './sourceTokenCandidates';
import { getNativeSourceToken } from '../../../../../UI/Bridge/utils/tokenUtils';
import { toChecksumAddress } from '../../../../../../util/address';
import { EVM_SCOPE } from '../../../../../UI/Earn/constants/networks';

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
  if (!address) {
    return [];
  }

  const keys = new Set<Hex>([address as Hex, address.toLowerCase() as Hex]);

  try {
    keys.add(toChecksumAddress(address) as Hex);
  } catch {
    // Ignore invalid addresses in tests or malformed candidate data.
  }

  return [...keys];
};

const getCachedNativeBalance = (
  accountsByChainId: AccountsByChainId,
  chainId: Hex,
  accountAddress?: string,
): string | undefined => {
  for (const accountKey of getAddressLookupKeys(accountAddress)) {
    const balance = accountsByChainId?.[chainId]?.[accountKey]?.balance;
    if (balance) {
      return balance;
    }
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
    if (!chainBalances) {
      continue;
    }

    for (const tokenKey of getAddressLookupKeys(tokenAddress)) {
      const balance = chainBalances[tokenKey];
      if (balance) {
        return balance;
      }
    }
  }

  return undefined;
};

const getTokenPrice = (
  tokenMarketData: ReturnType<typeof selectTokenMarketData>,
  chainId: Hex,
  tokenAddress: string,
): number | undefined => {
  for (const addressKey of getAddressLookupKeys(tokenAddress)) {
    const price = tokenMarketData?.[chainId]?.[addressKey]?.price;
    if (price !== undefined) {
      return price;
    }
  }

  return undefined;
};

/**
 * Returns source token options for QuickBuy.
 *
 * `options` is filtered to tokens where the user has a non-zero balance.
 * `fallback` is the destination chain's native token (with `balance: '0'`)
 * used as a placeholder when the user has no balance-bearing options, so the
 * sheet can still fetch a quote for the entered USD amount and surface an
 * "insufficient balance" CTA instead of showing a $0 total.
 *
 * Reads cached balances from Redux only:
 * - native balances from AccountTrackerController
 * - ERC-20 balances from TokenBalancesController
 */
export const useSourceTokenOptions = (
  destChainId: Hex | CaipChainId | undefined,
): {
  options: BridgeToken[];
  fallback: BridgeToken | undefined;
  isLoading: boolean;
} => {
  const candidates = useMemo(
    () => getSourceTokenCandidates(destChainId),
    [destChainId],
  );

  const accountAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketData = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);

  // Solana support — keep the whole InternalAccount; multichain balances are
  // keyed by account.id, not address.
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

  // Build the final options list from Redux balances
  const options = useMemo(() => {
    if (!accountAddress && !solanaAccount) return [];

    const result: BridgeToken[] = [];

    for (const candidate of candidates) {
      // ─── Solana branch ─────────────────────────────────────────────
      // Multichain balances are keyed by InternalAccount.id and assetId
      // (CAIP, e.g. `solana:5eykt.../slip44:501`). The rate is already in
      // USD, no native-currency conversion step.
      if (isSolanaChainId(candidate.chainId)) {
        if (!solanaAccount) continue;

        const balanceEntry =
          multichainBalances?.[solanaAccount.id]?.[candidate.address];
        const amountStr = balanceEntry?.amount;
        if (!amountStr) continue;

        const balanceNum = parseFloat(amountStr);
        if (isNaN(balanceNum) || balanceNum <= 0) continue;

        const rateStr = (
          multichainRates as Record<string, { rate?: string } | undefined>
        )?.[candidate.address]?.rate;
        const rateNum = rateStr ? parseFloat(rateStr) : NaN;
        if (isNaN(rateNum) || rateNum <= 0) continue;

        const fiatValue = balanceNum * rateNum;
        result.push({
          ...candidate,
          balance: amountStr,
          balanceFiat: `$${fiatValue.toFixed(2)}`,
          tokenFiatAmount: fiatValue,
          currencyExchangeRate: rateNum,
        });
        continue;
      }

      // ─── EVM branch ────────────────────────────────────────────────
      if (!accountAddress) continue;

      const chainId = candidate.chainId as Hex;
      let rawBalance: string | undefined;
      let displayBalance: string | undefined;

      if (isNativeToken(candidate.address)) {
        rawBalance = getCachedNativeBalance(
          accountsByChainId,
          chainId,
          accountAddress,
        );
      } else {
        rawBalance = getCachedErc20Balance(
          tokenBalances,
          accountAddress,
          chainId,
          candidate.address,
        );
      }

      if (!hasNonZeroHexBalance(rawBalance)) {
        continue;
      }

      try {
        displayBalance = formatUnits(rawBalance, candidate.decimals);
      } catch {
        continue;
      }

      const balanceNum = parseFloat(displayBalance);
      if (isNaN(balanceNum) || balanceNum <= 0) continue;

      // Compute fiat value and exchange rate
      const networkConfig = allNetworkConfigs?.[chainId];
      const nativeTicker = networkConfig?.nativeCurrency;
      const nativeConversionRate = nativeTicker
        ? (currencyRates?.[nativeTicker]?.usdConversionRate ?? 0)
        : 0;

      let exchangeRate: number;
      let fiatValue: number;

      if (isNativeToken(candidate.address)) {
        exchangeRate = nativeConversionRate;
        if (exchangeRate <= 0) {
          continue;
        }

        fiatValue = balanceNum * exchangeRate;
      } else {
        const tokenPrice = getTokenPrice(
          tokenMarketData,
          chainId,
          candidate.address,
        );

        if (tokenPrice !== undefined) {
          if (nativeConversionRate <= 0) {
            continue;
          }

          exchangeRate = tokenPrice * nativeConversionRate;
        } else {
          // Fallback for stablecoins: assume ~$1.00 when token price is unavailable.
          exchangeRate = 1.0;
        }

        if (exchangeRate <= 0) {
          continue;
        }

        fiatValue = balanceNum * exchangeRate;
      }

      result.push({
        ...candidate,
        balance: displayBalance,
        balanceFiat: `$${fiatValue.toFixed(2)}`,
        tokenFiatAmount: fiatValue,
        currencyExchangeRate: exchangeRate ?? undefined,
      });
    }

    result.sort((a, b) => (b.tokenFiatAmount ?? 0) - (a.tokenFiatAmount ?? 0));
    return result;
  }, [
    candidates,
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

  // Zero-balance placeholder so the sheet can still quote when the user has
  // no balance-bearing source tokens. We pick the destination chain's native
  // asset because no bridge hop is needed — the quote then reflects the pure
  // swap a funded user would see at the same USD amount.
  const fallback = useMemo<BridgeToken | undefined>(() => {
    if (!destChainId) return undefined;

    const nativeToken = getNativeSourceToken(destChainId);

    if (isSolanaChainId(nativeToken.chainId)) {
      const rateStr = (
        multichainRates as Record<string, { rate?: string } | undefined>
      )?.[nativeToken.address]?.rate;
      const rateNum = rateStr ? parseFloat(rateStr) : NaN;
      if (isNaN(rateNum) || rateNum <= 0) return undefined;
      return {
        ...nativeToken,
        balance: '0',
        balanceFiat: '$0.00',
        tokenFiatAmount: 0,
        currencyExchangeRate: rateNum,
      };
    }

    const chainId = nativeToken.chainId as Hex;
    const networkConfig = allNetworkConfigs?.[chainId];
    const nativeTicker = networkConfig?.nativeCurrency;
    const exchangeRate = nativeTicker
      ? (currencyRates?.[nativeTicker]?.usdConversionRate ?? 0)
      : 0;
    if (exchangeRate <= 0) return undefined;
    return {
      ...nativeToken,
      balance: '0',
      balanceFiat: '$0.00',
      tokenFiatAmount: 0,
      currencyExchangeRate: exchangeRate,
    };
  }, [destChainId, allNetworkConfigs, currencyRates, multichainRates]);

  return { options, fallback, isLoading: false };
};
