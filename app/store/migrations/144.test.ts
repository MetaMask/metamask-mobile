import { XlmScope, SolScope } from '@metamask/keyring-api';
import { KnownCaipNamespace } from '@metamask/utils';
import migration144 from './144';

describe('migration 144', () => {
  it('adds Stellar network enablement and multichain configs when missing', () => {
    const state = {
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: { '0x1': true },
              solana: { [SolScope.Mainnet]: true },
            },
            nativeAssetIdentifiers: {},
          },
          MultichainNetworkController: {
            multichainNetworkConfigurationsByChainId: {
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
                chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
                isEvm: false,
              },
            },
          },
        },
      },
    };

    const migrated = migration144(state) as typeof state;

    expect(
      migrated.engine.backgroundState.NetworkEnablementController
        .enabledNetworkMap[KnownCaipNamespace.Stellar],
    ).toEqual({
      [XlmScope.Pubnet]: true,
      [XlmScope.Testnet]: false,
    });
    expect(
      migrated.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId[XlmScope.Pubnet],
    ).toMatchObject({
      chainId: XlmScope.Pubnet,
      name: 'Stellar',
    });
    expect(
      migrated.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId[XlmScope.Testnet],
    ).toMatchObject({
      chainId: XlmScope.Testnet,
      name: 'Stellar Testnet',
    });
  });

  it('does not overwrite existing Stellar configuration', () => {
    const existingPubnetConfig = {
      chainId: XlmScope.Pubnet,
      isEvm: false,
      name: 'Custom Stellar',
      nativeCurrency: `${XlmScope.Pubnet}/slip44:148`,
    };
    const state = {
      engine: {
        backgroundState: {
          NetworkEnablementController: {
            enabledNetworkMap: {
              [KnownCaipNamespace.Stellar]: {
                [XlmScope.Pubnet]: false,
                [XlmScope.Testnet]: true,
              },
            },
            nativeAssetIdentifiers: {},
          },
          MultichainNetworkController: {
            multichainNetworkConfigurationsByChainId: {
              [XlmScope.Pubnet]: existingPubnetConfig,
            },
          },
        },
      },
    };

    const migrated = migration144(state) as typeof state;

    expect(
      migrated.engine.backgroundState.NetworkEnablementController
        .enabledNetworkMap[KnownCaipNamespace.Stellar],
    ).toEqual({
      [XlmScope.Pubnet]: false,
      [XlmScope.Testnet]: true,
    });
    expect(
      migrated.engine.backgroundState.MultichainNetworkController
        .multichainNetworkConfigurationsByChainId[XlmScope.Pubnet],
    ).toBe(existingPubnetConfig);
  });
});
