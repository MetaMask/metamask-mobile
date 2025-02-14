import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 56)) {
    // Increment the migration number as appropriate
    return state;
  }

  const preferencesController =
    state.engine.backgroundState.PreferencesController;

  if (!isObject(preferencesController)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 56: Invalid PreferencesController state error: '${typeof preferencesController}'`,
      ),
    );
    return state;
  }

  const decommisionedIpfsGateway = 'https://cloudflare-ipfs.com/ipfs/';
  const newDefaultIpfsGateway = 'https://dweb.link/ipfs/';

  if (decommisionedIpfsGateway === preferencesController?.ipfsGateway) {
    preferencesController.ipfsGateway = newDefaultIpfsGateway;
  }
  // Return the modified state
  return state;
}
