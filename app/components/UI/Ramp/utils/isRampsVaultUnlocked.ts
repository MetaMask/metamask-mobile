import { selectIsUnlocked } from '../../../../selectors/keyringController';
import { store } from '../../../../store';

/**
 * Purchase toasts are in-app UI. A locked vault is the logged-out screen, so
 * they stay hidden there.
 *
 * @returns Whether the keyring is unlocked.
 */
export function isRampsVaultUnlocked(): boolean {
  try {
    return selectIsUnlocked(store.getState()) === true;
  } catch {
    return false;
  }
}
