import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId, Hex } from '@metamask/utils';
import { formatUnits } from 'ethers/lib/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../reducers';
import { selectAccountsByChainId } from '../../../../../../selectors/accountTrackerController';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import { selectTokensBalances } from '../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../selectors/tokenRatesController';
import { selectCurrencyRates } from '../../../../../../selectors/currencyRateController';
import { getSourceTokenCandidates } from './sourceTokenCandidates';
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
 * Returns the list of source token options for QuickBuy,
 * filtered to only tokens where the user has a non-zero balance.
 *
 * Reads cached balances from Redux only:
 * - native balances from AccountTrackerController
 * - ERC-20 balances from TokenBalancesController
 */
export const useSourceTokenOptions = (
  destChainId: Hex | CaipChainId | undefined,
): { options: BridgeToken[]; isLoading: boolean } => {
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

  const allNetworkConfigs = useSelector(
    (state: RootState) =>
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId,
  );

  // Build the final options list from Redux balances
  const options = useMemo(() => {
    if (!accountAddress) return [];

    const result: BridgeToken[] = [];

    for (const candidate of candidates) {
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
        fiatValue = balanceNum * nativeConversionRate;
      } else {
        const tokenPrice = getTokenPrice(
          tokenMarketData,
          chainId,
          candidate.address,
        );

        if (tokenPrice && nativeConversionRate) {
          exchangeRate = tokenPrice * nativeConversionRate;
        } else {
          // Fallback for stablecoins: assume ~$1.00
          exchangeRate = 1.0;
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
    accountsByChainId,
    tokenBalances,
    tokenMarketData,
    currencyRates,
    allNetworkConfigs,
  ]);

  return { options, isLoading: false };
};
