import { MoneyAccountBalanceService } from '@metamask/money-account-balance-service';

export const MoneyAccountBalanceServiceQueryKeys = {
  GET_MUSD_BALANCE: `${MoneyAccountBalanceService.name}:getMusdBalance`,
  GET_VMUSD_BALANCE: `${MoneyAccountBalanceService.name}:getVmusdBalance`,
  GET_VAULT_APY: `${MoneyAccountBalanceService.name}:getVaultApy`,
  /** Internally, this helper fetches the vmUSD balance and exchange rate */
  GET_MUSD_EQUIVALENT_VALUE: `${MoneyAccountBalanceService.name}:getMusdEquivalentValue`,
  GET_EXCHANGE_RATE: `${MoneyAccountBalanceService.name}:getExchangeRate`,
  GET_MONEY_ACCOUNT_BALANCE: `${MoneyAccountBalanceService.name}:getMoneyAccountBalance`,
} as const;
