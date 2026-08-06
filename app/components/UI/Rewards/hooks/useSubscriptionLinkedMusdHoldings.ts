import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { Hex, parseCaipAccountId } from '@metamask/utils';
import { selectCurrentSubscriptionAccounts } from '../../../../selectors/rewards';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../Earn/constants/musd';
import {
  MONEY_ACCOUNT_MUSD_CHAIN_ID,
  VIP_MUSD_HOLDINGS_CHAIN_IDS,
} from '../constants/vipEquityMultiplier';
import { toChecksumAddress } from '../../../../util/address';
import { fromTokenMinimalUnitString } from '../../../../util/number/bigint';
import useMoneyAccountBalance from '../../Money/hooks/useMoneyAccountBalance';
import useMoneyAccountInfo from '../../Money/hooks/useMoneyAccountInfo';

export interface UseSubscriptionLinkedMusdHoldingsResult {
  /** Whole-dollar holdings string, or `undefined` while indeterminate. */
  holdingsUsd: string | undefined;
  /** True while a required input (the Money Account balance) is still loading. */
  isLoading: boolean;
  /** True when a required input failed and holdings cannot be determined. */
  hasError: boolean;
}

/**
 * Best-effort linked mUSD holdings for the VIP equity multiplier display.
 *
 * Sums wallet mUSD across {@link VIP_MUSD_HOLDINGS_CHAIN_IDS} for opted-in
 * on-device subscription EVM addresses, plus the primary Money Account total
 * (mUSD + vmUSD) — but only when that Money Account is itself tied to the
 * current subscription.
 *
 * Gaps (accepted): off-device linked accounts, non-primary Money Accounts,
 * unpolled token balances, not time-weighted. Display-only — never settlement
 * input (RWDS-1485).
 */
export const useSubscriptionLinkedMusdHoldings =
  (): UseSubscriptionLinkedMusdHoldingsResult => {
    const subscriptionAccounts = useSelector(selectCurrentSubscriptionAccounts);
    const allTokenBalances = useSelector(selectAllTokenBalances);
    const {
      isMoneyAccountFeatureEnabled,
      hasMoneyAccount,
      primaryMoneyAccount,
    } = useMoneyAccountInfo();

    const moneyAccountAddress = primaryMoneyAccount?.address?.toLowerCase();

    /**
     * EVM addresses that are both opted in and resolve to the current
     * subscription. `selectCurrentSubscriptionAccounts` already filters to the
     * active subscription, so the explicit `subscriptionId` check just makes
     * the requirement legible at the call site.
     */
    const linkedEvmAddresses = useMemo(() => {
      const addresses = new Set<string>();
      for (const account of subscriptionAccounts ?? []) {
        if (account.hasOptedIn !== true || !account.subscriptionId) {
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
      return addresses;
    }, [subscriptionAccounts]);

    /**
     * The Money Account balance only counts when that account is itself opted
     * in and tied to the current subscription. Without this check an unlinked
     * Money Account would credit a program-facing figure with a balance the
     * program does not recognise — the mirror of the wallet-side opt-in filter.
     */
    const includeMoneyAccountBalance =
      isMoneyAccountFeatureEnabled &&
      hasMoneyAccount &&
      moneyAccountAddress !== undefined &&
      linkedEvmAddresses.has(moneyAccountAddress);

    const { totalFiatRaw, isBalanceLoading, isBalanceFetchError } =
      useMoneyAccountBalance({ enabled: includeMoneyAccountBalance });

    const walletMusdTotal = useMemo(() => {
      let total = new BigNumber(0);
      for (const address of linkedEvmAddresses) {
        const balancesPerChain =
          allTokenBalances?.[address as Hex] ??
          allTokenBalances?.[toChecksumAddress(address) as Hex] ??
          {};
        for (const chainId of VIP_MUSD_HOLDINGS_CHAIN_IDS) {
          // The Money Account's mUSD on its own chain is already inside
          // `totalBalance` (musdBalance + vmusdValueInMusd). Skip just this
          // address/chain pair so its holdings on other chains still count,
          // and so the result does not depend on whether TokenBalancesController
          // happens to poll the Money Account address.
          if (
            includeMoneyAccountBalance &&
            address === moneyAccountAddress &&
            chainId === MONEY_ACCOUNT_MUSD_CHAIN_ID
          ) {
            continue;
          }
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
    }, [
      linkedEvmAddresses,
      allTokenBalances,
      includeMoneyAccountBalance,
      moneyAccountAddress,
    ]);

    const isLoading = includeMoneyAccountBalance && isBalanceLoading;
    const hasError =
      includeMoneyAccountBalance &&
      !isBalanceLoading &&
      (isBalanceFetchError || totalFiatRaw === undefined);

    const holdingsUsd = useMemo(() => {
      if (isLoading || hasError) {
        return undefined;
      }
      const total = includeMoneyAccountBalance
        ? walletMusdTotal.plus(totalFiatRaw as string)
        : walletMusdTotal;
      // Whole dollars: sub-dollar precision is never rendered, and keeping it
      // would change the request body — and therefore the controller's
      // holdings-keyed cache key — on every balance poll as vmUSD accrues.
      return total.decimalPlaces(0, BigNumber.ROUND_DOWN).toFixed();
    }, [
      isLoading,
      hasError,
      includeMoneyAccountBalance,
      totalFiatRaw,
      walletMusdTotal,
    ]);

    return { holdingsUsd, isLoading, hasError };
  };

export default useSubscriptionLinkedMusdHoldings;
