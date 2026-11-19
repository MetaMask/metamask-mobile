import { createSelector } from 'reselect';
import type { MoneyAccountLifecycle } from '@metamask/money-account-lifecycle-controller';
import { RootState } from '../../reducers';

const selectMoneyAccountLifecycles = (state: RootState) =>
  state.engine.backgroundState.MoneyAccountLifecycleController?.moneyAccounts;

/** Selects the `mfa` lifecycle, if the wallet has one. */
export const selectMfaMoneyAccountLifecycle = createSelector(
  selectMoneyAccountLifecycles,
  (lifecycles) =>
    Object.values(lifecycles ?? {}).find(
      (
        lifecycle,
      ): lifecycle is Exclude<
        MoneyAccountLifecycle,
        { type: 'notInIdentity' }
      > & {
        type: 'mfa';
      } => lifecycle.type === 'mfa',
    ),
);
