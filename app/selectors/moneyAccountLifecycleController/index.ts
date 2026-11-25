import { createSelector } from 'reselect';
import type { MoneyAccountLifecycle } from '@metamask/money-account-lifecycle-controller';
import { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../moneyAccountController';

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

/** Selects the MFA account's address while that account isn't on this device yet. */
export const selectMfaAddressPendingRestore = createSelector(
  selectMfaMoneyAccountLifecycle,
  selectPrimaryMoneyAccount,
  (lifecycle, primaryMoneyAccount) => {
    const mfaAddress = lifecycle?.identity.currentAddress;
    if (
      !mfaAddress ||
      mfaAddress.toLowerCase() === primaryMoneyAccount?.address.toLowerCase()
    ) {
      return undefined;
    }
    return mfaAddress;
  },
);

/** Selects the address Money shows: the MFA account's, else the primary Money account's. */
export const selectMoneyAccountDisplayAddress = createSelector(
  selectMfaAddressPendingRestore,
  selectPrimaryMoneyAccount,
  (mfaAddress, primaryMoneyAccount) =>
    mfaAddress ?? primaryMoneyAccount?.address,
);
