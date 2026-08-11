import {
  PaymentOverride,
  type ResolveSourceAmountRequest,
  type ResolveSourceAmountResponse,
} from '@metamask/transaction-pay-controller';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import { selectMoneyAccountRedeemableRaw } from '../../../../core/redux/slices/moneyBalance';

export function resolveSourceAmount({
  isMaxAmount,
  paymentOverride,
}: ResolveSourceAmountRequest): ResolveSourceAmountResponse | undefined {
  if (!isMaxAmount || paymentOverride !== PaymentOverride.MoneyAccount) {
    return undefined;
  }

  const state = ReduxService.store.getState() as RootState;
  const redeemableRaw = selectMoneyAccountRedeemableRaw(state);

  if (!redeemableRaw) {
    return undefined;
  }

  return { sourceAmountRaw: redeemableRaw };
}
