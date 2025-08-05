import { CronjobControllerState } from '@metamask/snaps-controllers';
import ReduxService from '../redux';
import {
  selectCronjobControllerStorageState,
  setCronjobControllerStorageState,
} from '../redux/slices/cronjobControllerStorage';

/**
 * A storage manager for CronjobController state.
 *
 * @deprecated This is a temporary fix, please do not use this class (or any
 * similar patterns) elsewhere.
 */
export class CronjobControllerStorageManager {
  /**
   * Get the initial CronjobController state.
   *
   * @returns The initial CronjobController state.
   */
  getInitialState() {
    const { cronjobControllerStorage } = selectCronjobControllerStorageState(
      ReduxService.store.getState(),
    );
    return cronjobControllerStorage;
  }

  /**
   * Set the CronjobController state.
   *
   * @param data - The CronjobController state to set.
   */
  set(data: CronjobControllerState) {
    ReduxService.store.dispatch(setCronjobControllerStorageState(data));
  }
}
