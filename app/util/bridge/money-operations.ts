import type { TransactionMeta } from '@metamask/transaction-controller';
import Engine from '../../core/Engine';
import type { BridgeToken } from '../../components/UI/Bridge/types';
import { MoneyAccountAction } from '@metamask/bridge-controller';

export const resolveMoneyAccountOperation = (
  srcToken?: BridgeToken,
  destToken?: BridgeToken,
): MoneyAccountAction | undefined =>
  srcToken?.isMoneyToken
    ? MoneyAccountAction.Withdraw
    : destToken?.isMoneyToken
      ? MoneyAccountAction.Deposit
      : undefined;
