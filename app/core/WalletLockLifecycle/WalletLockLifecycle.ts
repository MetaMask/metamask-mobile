import ReduxService from '../redux';
import { setIsWalletLocked as setIsWalletLockedAction } from '../../actions/user';

/**
 * In-memory wallet-lock boolean (SSOT for the process). Mirrored into Redux
 * so `selectIsWalletLocked` / `useSelector` re-render when it changes.
 * Not redux-persisted — process death clears it.
 */
let isWalletLocked = false;

const mirrorToRedux = (locked: boolean): void => {
  try {
    ReduxService.store.dispatch(setIsWalletLockedAction(locked));
  } catch {
    // Store may be unavailable in unit tests or very early boot.
  }
};

/**
 * Platform setter — call from the lock/overlay path (`true`) and after a
 * successful unlock navigation decision (`false`).
 */
export const setWalletLocked = (locked: boolean): void => {
  if (isWalletLocked === locked) {
    return;
  }
  isWalletLocked = locked;
  mirrorToRedux(locked);
};

/** Imperative read of the in-memory lock flag. */
export const getWalletLocked = (): boolean => isWalletLocked;

/** Test-only — resets the in-memory flag between suites. */
export const __resetWalletLockedForTests = (): void => {
  isWalletLocked = false;
};

export { selectIsWalletLocked } from '../../reducers/user/selectors';
