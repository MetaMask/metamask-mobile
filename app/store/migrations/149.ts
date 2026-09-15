import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 149;

const INFURA_IPFS_GATEWAY = 'https://ipfs.infura.io/ipfs/';
const DEFAULT_IPFS_GATEWAY = 'https://dweb.link/ipfs/';

/**
 * Migration 149: Replace the decommissioned Infura IPFS gateway with the
 * current default gateway.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const preferencesController =
    state.engine.backgroundState.PreferencesController;

  if (!isObject(preferencesController)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid PreferencesController state: '${typeof preferencesController}'`,
      ),
    );
    return state;
  }

  if (preferencesController.ipfsGateway !== INFURA_IPFS_GATEWAY) {
    return state;
  }

  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine.backgroundState,
        PreferencesController: {
          ...preferencesController,
          ipfsGateway: DEFAULT_IPFS_GATEWAY,
        },
      },
    },
  };
}
