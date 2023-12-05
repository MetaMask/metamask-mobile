import { toHex } from '@metamask/controller-utils';

/**
 * Converting chain id on decimal format to hexadecimal format
 * decided here https://github.com/MetaMask/core/pull/1367
 * @param {any} state - Redux state.
 * @returns Migrated Redux state.
 */
export default function migrate(state) {
  if (
    state?.engine?.backgroundState?.NetworkController?.providerConfig?.chainId
  ) {
    const networkControllerChainId =
      state.engine.backgroundState.NetworkController.providerConfig.chainId;

    state.engine.backgroundState.NetworkController.providerConfig.chainId =
      toHex(networkControllerChainId);
  }

  if (
    state?.engine?.backgroundState?.NetworkController?.providerConfig?.rpcTarget
  ) {
    const networkControllerRpcTarget =
      state.engine.backgroundState.NetworkController.providerConfig.rpcTarget;

    state.engine.backgroundState.NetworkController.providerConfig.rpcUrl =
      networkControllerRpcTarget;
  }
  return state;
}
