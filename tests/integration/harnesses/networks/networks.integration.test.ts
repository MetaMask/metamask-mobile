/**
 * Networks integration harness — Shape A.
 * Proves real NetworkController addNetwork / removeNetwork with mocked I/O,
 * and TokensController wipe when a network config is removed.
 */

import {
  buildNetworksIntegrationHarness,
  HARNESS_ACCOUNT_ADDRESS,
  HARNESS_CUSTOM_CHAIN_ID,
  HARNESS_CUSTOM_TOKEN,
  HARNESS_MAINNET_TOKEN,
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

  it('wipes TokensController state for a removed network without touching mainnet tokens', () => {
    const { tokensController, addCustomNetwork, removeCustomNetwork } =
      buildNetworksIntegrationHarness();

    addCustomNetwork();

    expect(
      tokensController.state.allTokens[HARNESS_CUSTOM_CHAIN_ID]?.[
        HARNESS_ACCOUNT_ADDRESS
      ],
    ).toEqual([HARNESS_CUSTOM_TOKEN]);
    expect(
      tokensController.state.allTokens['0x1']?.[HARNESS_ACCOUNT_ADDRESS],
    ).toEqual([HARNESS_MAINNET_TOKEN]);

    removeCustomNetwork();

    expect(
      tokensController.state.allTokens[HARNESS_CUSTOM_CHAIN_ID],
    ).toBeUndefined();
    expect(
      tokensController.state.allTokens['0x1']?.[HARNESS_ACCOUNT_ADDRESS],
    ).toEqual([HARNESS_MAINNET_TOKEN]);
  });
});
