import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { Hex, parseCaipAccountId } from '@metamask/utils';
import { selectCurrentSubscriptionAccounts } from '../../../../selectors/rewards';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import { selectMusdBalanceChainIds } from '../../Earn/selectors/featureFlags';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../Earn/constants/musd';
import { toChecksumAddress } from '../../../../util/address';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import useMoneyAccountBalance from '../../Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../Money/hooks/useMoneyAccountInfo';

/**
 * Best-effort linked-in-wallet mUSD holdings for VIP equity multiplier display.
 *
 * Sums wallet mUSD (Eth/Linea/Monad) for opted-in on-device subscription EVM
 * addresses plus the primary Money Account total (mUSD + vmUSD) when provisioned.
 *
 * Gaps (accepted): off-device linked accounts, non-primary Money Accounts,
 * unpolled token balances, not time-weighted. Display-only — never settlement
 * input (RWDS-1485).
 */
export const useSubscriptionLinkedMusdHoldings = (): {
  holdingsUsd: string | undefined;
} => {
  const subscriptionAccounts = useSelector(selectCurrentSubscriptionAccounts);
  const allTokenBalances = useSelector(selectAllTokenBalances);
  const musdBalanceChainIds = useSelector(selectMusdBalanceChainIds);
  const { isMoneyAccountFeatureEnabled, hasMoneyAccount } =
    useMoneyAccountInfo();
  const { totalFiatRaw, isBalanceLoading, isBalanceFetchError } =
    useMoneyAccountBalance({
      enabled: isMoneyAccountFeatureEnabled && hasMoneyAccount,
    });

  const linkedEvmAddresses = useMemo(() => {
    const addresses = new Set<string>();
    for (const account of subscriptionAccounts ?? []) {
      if (account.hasOptedIn !== true) {
        continue;
      }
      try {
        const parsed = parseCaipAccountId(account.account);
        if (parsed.chain.namespace !== 'eip155') {
          continue;
        }
        addresses.add(parsed.address.toLowerCase());
      } catch {
        // ignore malformed CAIP
      }
    }
    return [...addresses];
  }, [subscriptionAccounts]);

  const walletMusdTotal = useMemo(() => {
    let total = new BigNumber(0);
    for (const address of linkedEvmAddresses) {
      const balancesPerChain =
        allTokenBalances?.[address as Hex] ??
        allTokenBalances?.[toChecksumAddress(address) as Hex] ??
        {};
      for (const chainId of musdBalanceChainIds as Hex[]) {
        const tokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
        const chainBalances = balancesPerChain[chainId];
        if (!chainBalances || !tokenAddress) {
          continue;
        }
        const normalizedTokenAddress = toChecksumAddress(tokenAddress);
        const balanceHex =
          chainBalances[normalizedTokenAddress] ||
          chainBalances[tokenAddress] ||
          chainBalances[tokenAddress.toLowerCase() as Hex];
        if (!balanceHex || balanceHex === '0x0') {
          continue;
        }
        total = total.plus(
          fromTokenMinimalUnitString(balanceHex, MUSD_DECIMALS),
        );
      }
    }
    return total;
  }, [linkedEvmAddresses, allTokenBalances, musdBalanceChainIds]);

  const holdingsUsd = useMemo(() => {
    // Wait for Money Account when it is enabled and provisioned.
    if (isMoneyAccountFeatureEnabled && hasMoneyAccount) {
      if (
        isBalanceLoading ||
        isBalanceFetchError ||
        totalFiatRaw === undefined
      ) {
        return undefined;
      }
      return walletMusdTotal.plus(totalFiatRaw).toFixed();
    }
    // Wallet-only path (Money off or not provisioned).
    return walletMusdTotal.toFixed();
  }, [
    isMoneyAccountFeatureEnabled,
    hasMoneyAccount,
    isBalanceLoading,
    isBalanceFetchError,
    totalFiatRaw,
    walletMusdTotal,
  ]);

  return { holdingsUsd };
};

export default useSubscriptionLinkedMusdHoldings;
