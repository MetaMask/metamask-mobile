import { captureException } from '@sentry/react-native';
import { isObject, hasProperty } from '@metamask/utils';

/**
 * This migration removes network configuration for chainId 0x5 and switches
 * the selected network to 0x1 (Mainnet) if it was 0x5.
 * @param {unknown} stateAsync - Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  console.log('migrate 61 ..........');
  const state = await stateAsync;

  if (!isObject(state)) {
    captureException(
      new Error(`Migration: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine) || !hasProperty(state, 'engine')) {
    captureException(
      new Error(
        `Migration: Invalid or missing 'engine' in state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (
    !isObject(state.engine.backgroundState) ||
    !hasProperty(state.engine, 'backgroundState')
  ) {
    captureException(
      new Error(`Migration: Invalid or missing 'backgroundState' in engine.`),
    );
    return state;
  }

  const networkControllerState = state.engine.backgroundState.NetworkController;

  if (
    !isObject(networkControllerState) ||
    !hasProperty(state.engine.backgroundState, 'NetworkController')
  ) {
    captureException(
      new Error(`Migration: Missing 'NetworkController' in backgroundState.`),
    );
    return state;
  }

  const { networkConfigurationsByChainId } = networkControllerState;

  if (!isObject(networkConfigurationsByChainId)) {
    captureException(
      new Error(`Migration: Invalid 'networkConfigurationsByChainId'.`),
    );
    return state;
  }

  console.log('migrate 61 ..........');

  if (networkConfigurationsByChainId['0x5']) {
    // Remove chainId 0x5 (Goerli)
    delete networkConfigurationsByChainId['0x5'];
  }

  if (networkConfigurationsByChainId['0xe704']) {
    // Remove chainId 0xe704 (Sepolia)
    delete networkConfigurationsByChainId['0xe704'];
  }

  console.log('migrate 61 ..........', state);

  return state;
}
