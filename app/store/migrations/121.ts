import { hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';
import { checkNetworkEnablementState } from './121_utils';
import { captureException } from '@sentry/react-native';

export const migrationVersion = 121;

export const TARGET_KEY = 'eip155:999';
export const VALUE_TO_SET = 'eip155:999/slip44:2457';

// Context: HYPE token (eip155:999/slip44:2457) was incorrectly set to eip155:999/slip44:1 (1 instead of 2457)
// for some users in NetworkEnablementController.nativeAssetIdentifiers state.
// This is because https://chainid.network/chains.json is fetched to populate this state,
// and that chainId "999" references a "WanChain testnet" instead of HyperEVM.
// PR https://github.com/MetaMask/core/pull/7975 addresses future population by forcing an
// override at fetch-time.
// However such fetching is not always triggered if an user had already added the network,
// hence the need for this migration that - ontop of the PR above - will migrate the incorrect
// entry ('eip155:999/slip44:1') to the correct one ('eip155:999/slip44:2457').
//
// This migration will operate only if an entry already exists AND is not 'eip155:999/slip44:2457'.
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (!checkNetworkEnablementState(state, migrationVersion)) {
    return state;
  }

  try {
    const { nativeAssetIdentifiers } =
      state.engine.backgroundState.NetworkEnablementController;
    // Only setting the value if the key already exists
    if (!hasProperty(nativeAssetIdentifiers, TARGET_KEY)) {
      return state;
    }
    // Only setting the value if the key isn't already correctly set
    if (nativeAssetIdentifiers[TARGET_KEY] === VALUE_TO_SET) {
      return state;
    }
    // Setting the correct value, overridding the wrong one
    nativeAssetIdentifiers[TARGET_KEY] = VALUE_TO_SET;
    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
}
