import {
  PaymentOverride,
  type ResolveSourceAmountRequest,
  type ResolveSourceAmountResponse,
} from '@metamask/transaction-pay-controller';
import ReduxService from '../../../../core/redux/ReduxService';
import { RootState } from '../../../../reducers';
import {
  getUsableMoneyAccountRedeemableRaw,
  selectMoneyAccountRedeemable,
} from '../../../../core/redux/slices/moneyBalance';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';

export function resolveSourceAmount({
  isMaxAmount,
  paymentOverride,
}: ResolveSourceAmountRequest): ResolveSourceAmountResponse | undefined {
  if (!isMaxAmount || paymentOverride !== PaymentOverride.MoneyAccount) {
    return undefined;
  }

  const state = ReduxService.store.getState() as RootState;
  const redeemable = selectMoneyAccountRedeemable(state);
  const activeAddress = selectPrimaryMoneyAccount(state)?.address;

  const redeemableRaw = getUsableMoneyAccountRedeemableRaw(
    redeemable,
    activeAddress,
  );

  if (!redeemableRaw) {
    return undefined;
  }

  return { sourceAmountRaw: redeemableRaw };
}
