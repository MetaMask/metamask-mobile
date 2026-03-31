import type { MoneyAccountService } from './money-account-service';

export interface MoneyAccountServiceCreateMoneyAccountAction {
  type: `MoneyAccountService:createMoneyAccount`;
  handler: MoneyAccountService['createMoneyAccount'];
}

export interface MoneyAccountServiceGetMoneyAccountAction {
  type: `MoneyAccountService:getMoneyAccount`;
  handler: MoneyAccountService['getMoneyAccount'];
}

export type MoneyAccountServiceMethodActions =
  | MoneyAccountServiceCreateMoneyAccountAction
  | MoneyAccountServiceGetMoneyAccountAction;
