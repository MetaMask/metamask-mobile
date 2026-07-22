import { MoneyAccountBalanceService } from '@metamask/money-account-balance-service';
import { MoneyAccountApiDataService } from '@metamask/money-account-api-data-service';

export const MoneyAccountBalanceServiceQueryKeys = {
  GET_MUSD_BALANCE: `${MoneyAccountBalanceService.name}:getMusdBalance`,
  GET_VMUSD_BALANCE: `${MoneyAccountBalanceService.name}:getVmusdBalance`,
  GET_VAULT_APY: `${MoneyAccountBalanceService.name}:getVaultApy`,
  /** Internally, this helper fetches the vmUSD balance and exchange rate */
  GET_MUSD_EQUIVALENT_VALUE: `${MoneyAccountBalanceService.name}:getMusdEquivalentValue`,
  GET_EXCHANGE_RATE: `${MoneyAccountBalanceService.name}:getExchangeRate`,
  /**
   * RPC Multicall3 source adapter used internally by
   * {@link MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK}.
   * Not for presentation — invalidate alongside the facade on forced refresh.
   */
  GET_MONEY_ACCOUNT_BALANCE: `${MoneyAccountBalanceService.name}:getMoneyAccountBalance`,
  /**
   * Canonical Money Account balance via API/RPC facade
   * (`fetchBalanceWithFallback`). Prefer this for presentation.
   */
  FETCH_BALANCE_WITH_FALLBACK: `${MoneyAccountBalanceService.name}:fetchBalanceWithFallback`,
} as const;

export const MoneyAccountApiDataServiceQueryKeys = {
  /**
   * Money API positions (includes optional `balance` summary). Used as the API
   * source adapter behind `fetchBalanceWithFallback`. The package lowercases
   * the address in the query key.
   */
  FETCH_POSITIONS: `${MoneyAccountApiDataService.name}:fetchPositions`,
} as const;
