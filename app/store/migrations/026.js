import { isObject } from '@metamask/utils';
import { captureErrorException } from '../../util/sentry';

/**
 * This migration is to free space of unused data in the user devices
 * regarding the phishing list property listState, that is no longer used
 *
 **/
export default function migrate(state) {
  const keyringControllerState = state.engine.backgroundState.KeyringController;
  if (!isObject(keyringControllerState)) {
    captureErrorException(
      // @ts-expect-error We are not returning state not to stop the flow of Vault recovery
      new Error(
        `Migration 26: Invalid vault in KeyringController: '${typeof keyringControllerState}'`,
      ),
    );
  }
  const phishingControllerState =
    state.engine.backgroundState.PhishingController;
  if (phishingControllerState?.listState) {
    delete state.engine.backgroundState.PhishingController.listState;
  } else {
    captureErrorException(
      new Error(
        `Migration 26: Invalid PhishingControllerState controller state: '${JSON.stringify(
          state.engine.backgroundState.PhishingController,
        )}'`,
      ),
    );
  }

  if (
    phishingControllerState?.hotlistLastFetched &&
    phishingControllerState?.stalelistLastFetched
  ) {
    // This will make the list be fetched again when the user updates the app
    state.engine.backgroundState.PhishingController.hotlistLastFetched = 0;
    state.engine.backgroundState.PhishingController.stalelistLastFetched = 0;
  } else {
    captureErrorException(
      new Error(
        `Migration 26: Invalid PhishingControllerState hotlist and stale list fetched: '${JSON.stringify(
          state.engine.backgroundState.PhishingController,
        )}'`,
      ),
    );
  }

  return state;
}
