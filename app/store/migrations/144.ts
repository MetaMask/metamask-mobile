import { XlmScope } from '@metamask/keyring-api';
import { hasProperty, isObject, KnownCaipNamespace } from '@metamask/utils';
import { ensureValidState } from './util';

const STELLAR_PUBNET_CONFIG = {
  chainId: XlmScope.Pubnet,
  isEvm: false,
  name: 'Stellar',
  nativeCurrency: `${XlmScope.Pubnet}/slip44:148`,
} as const;

const STELLAR_TESTNET_CONFIG = {
  chainId: XlmScope.Testnet,
  isEvm: false,
  name: 'Stellar Testnet',
  nativeCurrency: `${XlmScope.Testnet}/slip44:148`,
} as const;

/**
 * Migration 144:
 *
 * Enable Stellar for existing wallets by adding network enablement entries and
 * multichain network configurations when missing.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 144;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const { backgroundState } = state.engine;

  if (
    hasProperty(backgroundState, 'NetworkEnablementController') &&
    isObject(backgroundState.NetworkEnablementController) &&
    hasProperty(
      backgroundState.NetworkEnablementController,
      'enabledNetworkMap',
    ) &&
    isObject(backgroundState.NetworkEnablementController.enabledNetworkMap)
  ) {
    const { enabledNetworkMap } = backgroundState.NetworkEnablementController;

    if (!hasProperty(enabledNetworkMap, KnownCaipNamespace.Stellar)) {
      enabledNetworkMap[KnownCaipNamespace.Stellar] = {
        [XlmScope.Pubnet]: true,
        [XlmScope.Testnet]: false,
      };
    }
  }

  if (
    hasProperty(backgroundState, 'MultichainNetworkController') &&
    isObject(backgroundState.MultichainNetworkController) &&
    hasProperty(
      backgroundState.MultichainNetworkController,
      'multichainNetworkConfigurationsByChainId',
    ) &&
    isObject(
      backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId,
    )
  ) {
    const { multichainNetworkConfigurationsByChainId } =
      backgroundState.MultichainNetworkController;

    if (
      !hasProperty(multichainNetworkConfigurationsByChainId, XlmScope.Pubnet)
    ) {
      multichainNetworkConfigurationsByChainId[XlmScope.Pubnet] = {
        ...STELLAR_PUBNET_CONFIG,
      };
    }

    if (
      !hasProperty(multichainNetworkConfigurationsByChainId, XlmScope.Testnet)
    ) {
      multichainNetworkConfigurationsByChainId[XlmScope.Testnet] = {
        ...STELLAR_TESTNET_CONFIG,
      };
    }
  }

  return state;
};

export default migration;
