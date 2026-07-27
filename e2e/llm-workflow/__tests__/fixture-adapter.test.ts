import type { WalletState } from '@metamask/client-mcp-core';
import type { Fixture } from '../../../tests/framework/fixtures/types';
import {
  fixtureToWalletState,
  rewritePortsInWalletState,
  walletStateToFixture,
} from '../capabilities/fixture-adapter';

jest.mock('@metamask/client-mcp-core', () => ({}));

const VALID_STATE_DATA: Record<string, unknown> = {
  engine: { backgroundState: {} },
  browser: { activeTab: null, tabs: [] },
  user: { passwordSet: true },
  fiatOrders: { orders: [] },
  legalNotices: { newPrivacyPolicyToastShownDate: 0 },
};

describe('fixtureToWalletState', () => {
  it('returns data unchanged and parses version from asyncState', () => {
    const fixture = {
      state: { engine: {}, browser: {} },
      asyncState: { version: '5' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.data).toBe(fixture.state);
    expect(result.meta).toEqual({ version: 5 });
  });

  it('omits meta when asyncState has no version', () => {
    const fixture = {
      state: { engine: {} },
      asyncState: {},
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.data).toBe(fixture.state);
    expect(result).not.toHaveProperty('meta');
  });

  it('omits meta when version is not a finite number (alphabetic)', () => {
    const fixture = {
      state: {},
      asyncState: { version: 'abc' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result).not.toHaveProperty('meta');
  });

  it('parses empty string version as 0 (Number("") === 0)', () => {
    const fixture = {
      state: {},
      asyncState: { version: '' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.meta).toEqual({ version: 0 });
  });

  it('drops extra asyncState keys — only version is used', () => {
    const fixture = {
      state: {},
      asyncState: { version: '10', extra: 'ignored', another: 'dropped' },
    } as unknown as Fixture;

    const result = fixtureToWalletState(fixture);

    expect(result.meta).toEqual({ version: 10 });
    expect(result).not.toHaveProperty('extra');
    expect(result).not.toHaveProperty('another');
  });
});

describe('walletStateToFixture', () => {
  it('converts valid WalletState with meta.version to Fixture', () => {
    const state: WalletState = {
      data: { ...VALID_STATE_DATA },
      meta: { version: 1 },
    };

    const result = walletStateToFixture(state);

    expect(result.state).toBe(state.data);
    expect(result.asyncState).toEqual({ version: '1' });
  });

  it('returns empty asyncState when meta is undefined', () => {
    const state: WalletState = { data: { ...VALID_STATE_DATA } };

    const result = walletStateToFixture(state);

    expect(result.asyncState).toEqual({});
  });

  it('includes asyncState.version when meta.version is 0', () => {
    const state: WalletState = {
      data: { ...VALID_STATE_DATA },
      meta: { version: 0 },
    };

    const result = walletStateToFixture(state);

    expect(result.asyncState).toEqual({ version: '0' });
  });

  describe('throws when required key is missing', () => {
    const requiredKeys = [
      'engine',
      'browser',
      'user',
      'fiatOrders',
      'legalNotices',
    ];

    for (const key of requiredKeys) {
      it(`throws for missing "${key}"`, () => {
        const data = { ...VALID_STATE_DATA };
        delete data[key];

        expect(() => walletStateToFixture({ data })).toThrow(
          `Invalid WalletState: missing or malformed required FixtureState key "${key}".`,
        );
      });
    }
  });

  it('throws when required key is null', () => {
    const data = { ...VALID_STATE_DATA, engine: null };

    expect(() => walletStateToFixture({ data })).toThrow(
      'Invalid WalletState: missing or malformed required FixtureState key "engine".',
    );
  });

  it('throws when required key is a primitive', () => {
    const data = { ...VALID_STATE_DATA, engine: 'string' };

    expect(() => walletStateToFixture({ data })).toThrow(
      'Invalid WalletState: missing or malformed required FixtureState key "engine".',
    );
  });
});

describe('round-trip', () => {
  it('walletStateToFixture(fixtureToWalletState(fixture)) equals the input', () => {
    const fixture: Fixture = {
      state: VALID_STATE_DATA as Fixture['state'],
      asyncState: { version: '42' },
    };

    const walletState = fixtureToWalletState(fixture);
    const roundTripped = walletStateToFixture(walletState);

    expect(roundTripped).toEqual(fixture);
  });

  it('round-trip works when asyncState has no version', () => {
    const fixture: Fixture = {
      state: VALID_STATE_DATA as Fixture['state'],
      asyncState: {},
    };

    const walletState = fixtureToWalletState(fixture);
    const roundTripped = walletStateToFixture(walletState);

    expect(roundTripped.state).toBe(fixture.state);
    expect(roundTripped.asyncState).toEqual({});
  });
});

describe('rewritePortsInWalletState', () => {
  it('returns unchanged data when no overrides provided', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x539': {
                  rpcEndpoints: [{ url: 'http://localhost:8545/rpc' }],
                },
              },
            },
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, {});

    // Assert
    expect(result.data).toEqual(state.data);
  });

  it('returns unchanged data when anvilPort matches default (8545)', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x539': {
                  rpcEndpoints: [{ url: 'http://localhost:8545/rpc' }],
                },
              },
            },
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, { anvilPort: 8545 });

    // Assert
    expect(result.data).toEqual(state.data);
  });

  it('rewrites Anvil port in RPC endpoint URLs', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x539': {
                  rpcEndpoints: [
                    { url: 'http://localhost:8545/rpc' },
                    { url: 'http://localhost:8545' },
                  ],
                },
                '0x1': {
                  rpcEndpoints: [{ url: 'http://localhost:8545/v1' }],
                },
              },
            },
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, { anvilPort: 8546 });

    // Assert
    const networkConfigs = (result.data.engine as Record<string, unknown>)
      .backgroundState as Record<string, unknown>;
    const controller = networkConfigs.NetworkController as Record<
      string,
      unknown
    >;
    const configs = controller.networkConfigurationsByChainId as Record<
      string,
      unknown
    >;

    const chain539 = configs['0x539'] as Record<string, unknown>;
    const endpoints539 = chain539.rpcEndpoints as Record<string, unknown>[];
    expect(endpoints539[0].url).toBe('http://localhost:8546/rpc');
    expect(endpoints539[1].url).toBe('http://localhost:8546');

    const chain1 = configs['0x1'] as Record<string, unknown>;
    const endpoints1 = chain1.rpcEndpoints as Record<string, unknown>[];
    expect(endpoints1[0].url).toBe('http://localhost:8546/v1');
  });

  it('rewrites mock server port across all backgroundState controllers', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            ControllerA: {
              config: 'http://localhost:8000/api',
            },
            ControllerB: {
              nested: {
                url: 'http://localhost:8000/endpoint',
              },
            },
            ControllerC: {
              data: 'no mock server reference',
            },
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, { mockServerPort: 8001 });

    // Assert
    const bgState = (result.data.engine as Record<string, unknown>)
      .backgroundState as Record<string, unknown>;

    const controllerA = bgState.ControllerA as Record<string, unknown>;
    expect(controllerA.config).toBe('http://localhost:8001/api');

    const controllerB = bgState.ControllerB as Record<string, unknown>;
    const nested = controllerB.nested as Record<string, unknown>;
    expect(nested.url).toBe('http://localhost:8001/endpoint');

    const controllerC = bgState.ControllerC as Record<string, unknown>;
    expect(controllerC.data).toBe('no mock server reference');
  });

  it('returns unchanged data when mockServerPort matches default (8000)', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            ControllerA: {
              config: 'http://localhost:8000/api',
            },
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, { mockServerPort: 8000 });

    // Assert
    expect(result.data).toEqual(state.data);
  });

  it('handles missing networkConfigurationsByChainId gracefully', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            NetworkController: {},
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, { anvilPort: 8546 });

    // Assert
    expect(result.data).toEqual(state.data);
  });

  it('handles empty networkConfigurationsByChainId gracefully', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {},
            },
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, { anvilPort: 8546 });

    // Assert
    expect(result.data).toEqual(state.data);
  });

  it('does not mutate the original state (deep clone verification)', () => {
    // Arrange
    const originalData = {
      ...VALID_STATE_DATA,
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x539': {
                rpcEndpoints: [{ url: 'http://localhost:8545/rpc' }],
              },
            },
          },
        },
      },
    };
    const state: WalletState = { data: originalData };

    // Act
    const result = rewritePortsInWalletState(state, { anvilPort: 8546 });

    // Assert
    // Verify original is unchanged
    const originalEndpoints = (
      (originalData.engine as Record<string, unknown>)
        .backgroundState as Record<string, unknown>
    ).NetworkController as Record<string, unknown>;
    const originalConfigs =
      originalEndpoints.networkConfigurationsByChainId as Record<
        string,
        unknown
      >;
    const originalChain = originalConfigs['0x539'] as Record<string, unknown>;
    const originalUrls = originalChain.rpcEndpoints as Record<string, unknown>[];
    expect(originalUrls[0].url).toBe('http://localhost:8545/rpc');

    // Verify result is changed
    const resultEndpoints = (
      (result.data.engine as Record<string, unknown>).backgroundState as Record<
        string,
        unknown
      >
    ).NetworkController as Record<string, unknown>;
    const resultConfigs =
      resultEndpoints.networkConfigurationsByChainId as Record<string, unknown>;
    const resultChain = resultConfigs['0x539'] as Record<string, unknown>;
    const resultUrls = resultChain.rpcEndpoints as Record<string, unknown>[];
    expect(resultUrls[0].url).toBe('http://localhost:8546/rpc');
  });

  it('handles both overrides simultaneously', () => {
    // Arrange
    const state: WalletState = {
      data: {
        ...VALID_STATE_DATA,
        engine: {
          backgroundState: {
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x539': {
                  rpcEndpoints: [{ url: 'http://localhost:8545/rpc' }],
                },
              },
            },
            ControllerA: {
              config: 'http://localhost:8000/api',
            },
          },
        },
      },
    };

    // Act
    const result = rewritePortsInWalletState(state, {
      anvilPort: 8546,
      mockServerPort: 8001,
    });

    // Assert
    const bgState = (result.data.engine as Record<string, unknown>)
      .backgroundState as Record<string, unknown>;

    // Check Anvil port rewrite
    const networkController = bgState.NetworkController as Record<
      string,
      unknown
    >;
    const configs = networkController.networkConfigurationsByChainId as Record<
      string,
      unknown
    >;
    const chain = configs['0x539'] as Record<string, unknown>;
    const endpoints = chain.rpcEndpoints as Record<string, unknown>[];
    expect(endpoints[0].url).toBe('http://localhost:8546/rpc');

    // Check mock server port rewrite
    const controllerA = bgState.ControllerA as Record<string, unknown>;
    expect(controllerA.config).toBe('http://localhost:8001/api');
  });
});
