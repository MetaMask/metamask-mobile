import migrate, { CHAINS_TO_RENAME } from './100';

const migrationVersion = 100;

type NetworkConfig = Record<string, { chainId: string; name: string }>;

// Create network configurations based on CHAINS_TO_RENAME data
const createNetworkConfigs = () => {
  const configs: NetworkConfig = {};

  // Add configurations for chains that will be renamed
  CHAINS_TO_RENAME.forEach((chain) => {
    configs[chain.id] = {
      chainId: chain.id,
      name: chain.fromName,
    };
  });

  return configs;
};

const networkConfigs = createNetworkConfigs();

// Helper to create test state
const createTestState = (networkConfigurationsByChainId: NetworkConfig) => ({
  engine: {
    backgroundState: {
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {},
        networkConfigurationsByChainId,
      },
    },
  },
  settings: {},
  security: {},
});

// Network name mappings for migration testing (derived from CHAINS_TO_RENAME)
const nameUpdates: Record<string, string> = Object.fromEntries(
  CHAINS_TO_RENAME.map((chain) => [chain.id, chain.toName]),
);

describe(`migration #${migrationVersion}`, () => {
  describe('ensureValidState validation', () => {
    it('returns original state if state is not an object', () => {
      const invalidState = 'invalid';
      const result = migrate(invalidState);
      expect(result).toBe(invalidState);
    });

    it('returns original state if engine is not an object', () => {
      const invalidState = { engine: 'invalid' };
      const result = migrate(invalidState);
      expect(result).toBe(invalidState);
    });

    it('returns original state if engine.backgroundState is not an object', () => {
      const invalidState = { engine: { backgroundState: 'invalid' } };
      const result = migrate(invalidState);
      expect(result).toBe(invalidState);
    });
  });

  describe('NetworkController state transformations', () => {
    it('returns original state if NetworkController is missing', () => {
      const state = {
        engine: {
          backgroundState: {},
        },
        settings: {},
        security: {},
      };
      const result = migrate(state);
      expect(result).toBe(state);
    });

    it('returns original state if NetworkController is not an object', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: 'invalidData',
          },
        },
        settings: {},
        security: {},
      };
      const result = migrate(state);
      expect(result).toBe(state);
    });

    it('returns original state if networkConfigurationsByChainId is missing', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {},
          },
        },
        settings: {},
        security: {},
      };
      const result = migrate(state);
      expect(result).toBe(state);
    });

    it('returns original state if networkConfigurationsByChainId is not an object', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: 'invalidData',
            },
          },
        },
        settings: {},
        security: {},
      };
      const result = migrate(state);
      expect(result).toBe(state);
    });

    it('skips chains that are not found in networkConfigurationsByChainId', () => {
      const partialNetworkConfigs: NetworkConfig = {
        // Only include first chain from CHAINS_TO_RENAME
        [CHAINS_TO_RENAME[0].id]: {
          chainId: CHAINS_TO_RENAME[0].id,
          name: CHAINS_TO_RENAME[0].fromName,
        },
      };

      const oldState = createTestState(partialNetworkConfigs);
      const result = migrate(oldState);

      // Should only update the one chain that exists
      const expected = {
        ...oldState,
        engine: {
          ...oldState.engine,
          backgroundState: {
            ...oldState.engine.backgroundState,
            NetworkController: {
              ...oldState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: {
                [CHAINS_TO_RENAME[0].id]: {
                  chainId: CHAINS_TO_RENAME[0].id,
                  name: CHAINS_TO_RENAME[0].toName,
                },
              },
            },
          },
        },
      };

      expect(result).toStrictEqual(expected);
    });

    it('does nothing if network configuration is not an object', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [CHAINS_TO_RENAME[0].id]: 'invalidConfig',
              },
            },
          },
        },
        settings: {},
        security: {},
      };

      const result = migrate(state);
      expect(result).toBe(state);
    });

    it('does nothing if network configuration does not have name property', () => {
      const state = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                [CHAINS_TO_RENAME[0].id]: {
                  chainId: CHAINS_TO_RENAME[0].id,
                  // Missing name property
                },
              },
            },
          },
        },
        settings: {},
        security: {},
      };

      const result = migrate(state);
      expect(result).toBe(state);
    });

    it('does nothing if network has custom names (not matching fromName)', () => {
      // Create network configs with custom names (should not be migrated)
      const customNetworkConfigs = { ...networkConfigs };

      // Add "Custom" suffix to all chain names to make them non-matching
      Object.keys(customNetworkConfigs).forEach((chainId) => {
        if (customNetworkConfigs[chainId]) {
          customNetworkConfigs[chainId] = {
            ...customNetworkConfigs[chainId],
            name: `${customNetworkConfigs[chainId].name} Custom`,
          };
        }
      });

      const oldState = createTestState(customNetworkConfigs);
      const result = migrate(oldState);
      expect(result).toBe(oldState);
    });

    it('updates all network names from old names to new ones', () => {
      const oldState = createTestState(networkConfigs);
      const result = migrate(oldState);

      // Create expected data by applying name updates
      const expectedNetworkConfigs = { ...networkConfigs };
      Object.entries(nameUpdates).forEach(([chainId, newName]) => {
        const config =
          expectedNetworkConfigs[
            chainId as keyof typeof expectedNetworkConfigs
          ];
        if (config) {
          expectedNetworkConfigs[
            chainId as keyof typeof expectedNetworkConfigs
          ] = {
            ...config,
            name: newName,
          };
        }
      });

      const expectedState = {
        ...oldState,
        engine: {
          ...oldState.engine,
          backgroundState: {
            ...oldState.engine.backgroundState,
            NetworkController: {
              ...oldState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: expectedNetworkConfigs,
            },
          },
        },
      };

      expect(result).toStrictEqual(expectedState);
    });

    it('updates only matching network names and leaves others unchanged', () => {
      const mixedNetworkConfigs = {
        ...networkConfigs,
        // Add a custom network that shouldn't be changed
        'custom-chain-id': {
          chainId: 'custom-chain-id',
          name: 'Custom Network',
        },
      };

      const oldState = createTestState(mixedNetworkConfigs);
      const result = migrate(oldState);

      // Create expected data
      const expectedNetworkConfigs = { ...networkConfigs };
      Object.entries(nameUpdates).forEach(([chainId, newName]) => {
        const config =
          expectedNetworkConfigs[
            chainId as keyof typeof expectedNetworkConfigs
          ];
        if (config) {
          expectedNetworkConfigs[
            chainId as keyof typeof expectedNetworkConfigs
          ] = {
            ...config,
            name: newName,
          };
        }
      });

      // Add the unchanged custom network
      expectedNetworkConfigs['custom-chain-id'] = {
        chainId: 'custom-chain-id',
        name: 'Custom Network',
      };

      const expectedState = {
        ...oldState,
        engine: {
          ...oldState.engine,
          backgroundState: {
            ...oldState.engine.backgroundState,
            NetworkController: {
              ...oldState.engine.backgroundState.NetworkController,
              networkConfigurationsByChainId: expectedNetworkConfigs,
            },
          },
        },
      };

      expect(result).toStrictEqual(expectedState);
    });

    // Test each individual chain rename
    CHAINS_TO_RENAME.forEach((chain) => {
      it(`updates ${chain.fromName} to ${chain.toName} for chain ${chain.id}`, () => {
        const singleChainConfig = {
          [chain.id]: {
            chainId: chain.id,
            name: chain.fromName,
          },
        };

        const oldState = createTestState(singleChainConfig);
        const result = migrate(oldState);

        const expectedState = {
          ...oldState,
          engine: {
            ...oldState.engine,
            backgroundState: {
              ...oldState.engine.backgroundState,
              NetworkController: {
                ...oldState.engine.backgroundState.NetworkController,
                networkConfigurationsByChainId: {
                  [chain.id]: {
                    chainId: chain.id,
                    name: chain.toName,
                  },
                },
              },
            },
          },
        };

        expect(result).toStrictEqual(expectedState);
      });
    });
  });

  describe('error handling', () => {
    it('returns original state and captures exception when migration throws an error', () => {
      // Create a state that will cause an error during processing
      const problematicState = {
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                // Create a getter that throws an error
                get [CHAINS_TO_RENAME[0].id]() {
                  throw new Error('Test error');
                },
              },
            },
          },
        },
        settings: {},
        security: {},
      };

      const result = migrate(problematicState);
      expect(result).toBe(problematicState);
    });
  });
});
