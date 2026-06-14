import { MoneyAccountBalanceService } from '@metamask/money-account-balance-service';

export const MoneyAccountBalanceServiceQueryKeys = {
  GET_MUSD_BALANCE: `${MoneyAccountBalanceService.name}:getMusdBalance`,
  GET_MUSDSHFVD_BALANCE: `${MoneyAccountBalanceService.name}:getMusdSHFvdBalance`,
  GET_VAULT_APY: `${MoneyAccountBalanceService.name}:getVaultApy`,
  /** Internally, this helper fetches the musdSHFvd balance and exchange rate */
  GET_MUSD_EQUIVALENT_VALUE: `${MoneyAccountBalanceService.name}:getMusdEquivalentValue`,
  GET_EXCHANGE_RATE: `${MoneyAccountBalanceService.name}:getExchangeRate`,
} as const;
