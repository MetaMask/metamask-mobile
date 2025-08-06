import { CronjobControllerState } from '@metamask/snaps-controllers';
import ReduxService from '../redux';
import {
  selectCronjobControllerState,
  setCronjobControllerState,
} from '../redux/slices/cronjobController';

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
    const { storage } = selectCronjobControllerState(
      ReduxService.store.getState(),
    );

    return storage;
  }

  /**
   * Set the CronjobController state.
   *
   * @param data - The CronjobController state to set.
   */
  set(data: CronjobControllerState) {
    ReduxService.store.dispatch(setCronjobControllerState(data));
  }
}
