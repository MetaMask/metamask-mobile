/**
 * Networks integration harness — Shape A.
 * Proves real NetworkController addNetwork / removeNetwork with mocked I/O.
 */

import {
  buildNetworksIntegrationHarness,
  HARNESS_CUSTOM_CHAIN_ID,
} from './networks';

describe('Networks integration harness — Shape A', () => {
  it('adds a custom network into networkConfigurationsByChainId', () => {
    const { networkController, addCustomNetwork } =
      buildNetworksIntegrationHarness();

    expect(
      networkController.state.networkConfigurationsByChainId[
        HARNESS_CUSTOM_CHAIN_ID
      ],
    ).toBeUndefined();

    const added = addCustomNetwork();

    expect(added.chainId).toBe(HARNESS_CUSTOM_CHAIN_ID);
    expect(added.name).toBe('Gnosis');
    expect(
      networkController.state.networkConfigurationsByChainId[
        HARNESS_CUSTOM_CHAIN_ID
      ],
    ).toEqual(
      expect.objectContaining({
        chainId: HARNESS_CUSTOM_CHAIN_ID,
        name: 'Gnosis',
        nativeCurrency: 'xDAI',
      }),
    );
  });

  it('removes a custom network from networkConfigurationsByChainId', () => {
    const { networkController, addCustomNetwork, removeCustomNetwork } =
      buildNetworksIntegrationHarness();

    addCustomNetwork();
    expect(
      networkController.state.networkConfigurationsByChainId[
        HARNESS_CUSTOM_CHAIN_ID
      ],
    ).toBeDefined();

    removeCustomNetwork();

    expect(
      networkController.state.networkConfigurationsByChainId[
        HARNESS_CUSTOM_CHAIN_ID
      ],
    ).toBeUndefined();
  });
});
