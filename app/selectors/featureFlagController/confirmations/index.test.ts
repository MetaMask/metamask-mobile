import { cloneDeep } from 'lodash';
import {
  selectMetaMaskPayFlags,
  BUFFER_STEP_DEFAULT,
  BUFFER_INITIAL_DEFAULT,
  ATTEMPTS_MAX_DEFAULT,
  SLIPPAGE_DEFAULT,
  BUFFER_SUBSEQUENT_DEFAULT,
  selectNonZeroUnusedApprovalsAllowList,
  selectGasFeeTokenFlags,
  GasFeeTokenFlags,
  selectPayPostQuoteFlags,
  resolvePayPostQuoteConfig,
  PayPostQuoteFlags,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { Hex } from '@metamask/utils';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('MetaMask Pay Feature Flags', () => {
  it('returns default buffer step if not in feature flags', () => {
    expect(selectMetaMaskPayFlags(mockedEmptyFlagsState).bufferStep).toEqual(
      BUFFER_STEP_DEFAULT,
    );
  });

  it('returns default buffer initial if not in feature flags', () => {
    expect(selectMetaMaskPayFlags(mockedEmptyFlagsState).bufferInitial).toEqual(
      BUFFER_INITIAL_DEFAULT,
    );
  });

  it('returns default buffer subsequent if not in feature flags', () => {
    expect(
      selectMetaMaskPayFlags(mockedEmptyFlagsState).bufferSubsequent,
    ).toEqual(BUFFER_SUBSEQUENT_DEFAULT);
  });

  it('returns default attempts max if not in feature flags', () => {
    expect(selectMetaMaskPayFlags(mockedEmptyFlagsState).attemptsMax).toEqual(
      ATTEMPTS_MAX_DEFAULT,
    );
  });

  it('returns default slippage if not in feature flags', () => {
    expect(selectMetaMaskPayFlags(mockedEmptyFlagsState).slippage).toEqual(
      SLIPPAGE_DEFAULT,
    );
  });

  it('returns buffer step from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay: {
          bufferStep: 1.234,
        },
      };

    expect(selectMetaMaskPayFlags(state).bufferStep).toEqual(1.234);
  });

  it('returns initial buffer from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay: {
          bufferInitial: 2.345,
        },
      };

    expect(selectMetaMaskPayFlags(state).bufferInitial).toEqual(2.345);
  });

  it('returns subsequent buffer from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay: {
          bufferSubsequent: 5.678,
        },
      };

    expect(selectMetaMaskPayFlags(state).bufferSubsequent).toEqual(5.678);
  });

  it('returns max attempts from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay: {
          attemptsMax: 3,
        },
      };

    expect(selectMetaMaskPayFlags(state).attemptsMax).toEqual(3);
  });

  it('returns slippage from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay: {
          slippage: 0.123,
        },
      };

    expect(selectMetaMaskPayFlags(state).slippage).toEqual(0.123);
  });
});

describe('Non-Zero Unused Approvals Allow List', () => {
  const mockedStateWithAllowList = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            nonZeroUnusedApprovals: [
              'https://example.com',
              'https://another-example.com',
            ],
          },
          cacheTimestamp: 0,
        },
      },
    },
  };

  const mockedStateWithoutAllowList = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            nonZeroUnusedApprovals: [],
          },
          cacheTimestamp: 0,
        },
      },
    },
  };

  it('returns the allow list when set in remote feature flags', () => {
    const result = selectNonZeroUnusedApprovalsAllowList(
      mockedStateWithAllowList,
    );
    expect(result).toEqual([
      'https://example.com',
      'https://another-example.com',
    ]);
  });

  it('returns an empty array when the list is empty in remote feature flags', () => {
    const result = selectNonZeroUnusedApprovalsAllowList(
      mockedStateWithoutAllowList,
    );
    expect(result).toEqual([]);
  });

  it('handles cases where RemoteFeatureFlagController is undefined', () => {
    const undefinedFeatureFlagState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: undefined,
        },
      },
    };

    const result = selectNonZeroUnusedApprovalsAllowList(
      undefinedFeatureFlagState,
    );
    expect(result).toEqual([]);
  });
});

describe('Gas Fee Token Flags', () => {
  const chainIdMock = '0x1' as Hex;

  const mockedGasFeeTokenFlags: GasFeeTokenFlags = {
    gasFeeTokens: {
      [chainIdMock]: {
        name: 'Ethereum',
        tokens: [
          {
            name: 'USDC',
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
          },
          {
            name: 'DAI',
            address: '0x6b175474e89094c44da98b954eedeac495271d0f' as Hex,
          },
        ],
      },
      '0x89': {
        name: 'Polygon',
        tokens: [{ name: 'USDC.e', address: '0xusdce' as Hex }],
      },
    },
  };

  const mockedStateWithGasFeeTokenFlags = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            confirmations_gas_fee_tokens: mockedGasFeeTokenFlags,
          },
          cacheTimestamp: 0,
        },
      },
    },
  };

  it('returns empty gasFeeTokens when empty feature flag state', () => {
    const result = selectGasFeeTokenFlags(mockedEmptyFlagsState);

    expect(result).toEqual({ gasFeeTokens: {} });
  });

  it('returns empty gasFeeTokens when undefined RemoteFeatureFlagController state', () => {
    const result = selectGasFeeTokenFlags(mockedUndefinedFlagsState);

    expect(result).toEqual({ gasFeeTokens: {} });
  });

  it('returns gas fee tokens from feature flag', () => {
    const result = selectGasFeeTokenFlags(
      mockedStateWithGasFeeTokenFlags as never,
    );

    expect(result).toEqual(mockedGasFeeTokenFlags);
  });

  it('returns empty gasFeeTokens when confirmations_gas_fee_tokens exists but gasFeeTokens is undefined', () => {
    const stateWithUndefinedGasFeeTokens = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              confirmations_gas_fee_tokens: {},
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const result = selectGasFeeTokenFlags(stateWithUndefinedGasFeeTokens);

    expect(result).toEqual({ gasFeeTokens: {} });
  });
});

describe('selectPayPostQuoteFlags', () => {
  it('returns disabled default when confirmations_pay_post_quote is missing', () => {
    const result = selectPayPostQuoteFlags(mockedEmptyFlagsState);

    expect(result.default).toEqual({ enabled: false, tokens: undefined });
    expect(result.override).toBeUndefined();
  });

  it('returns default config from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);
    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay_post_quote: {
          default: {
            enabled: true,
            tokens: {
              '0x1': [
                '0x0000000000000000000000000000000000000000',
                '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              ],
            },
          },
        },
      };

    const result = selectPayPostQuoteFlags(state);
    expect(result.default.enabled).toBe(true);
    expect(result.default.tokens).toEqual({
      '0x1': [
        '0x0000000000000000000000000000000000000000',
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      ],
    });
    expect(result.override).toBeUndefined();
  });

  it('returns override configs from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);
    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay_post_quote: {
          default: { enabled: true },
          override: {
            predictWithdraw: {
              enabled: true,
              tokens: {
                '0x89': ['0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'],
              },
            },
            perpsWithdraw: {
              enabled: false,
            },
          },
        },
      };

    const result = selectPayPostQuoteFlags(state);
    expect(result.override?.predictWithdraw).toEqual({
      enabled: true,
      tokens: {
        '0x89': ['0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'],
      },
    });
    expect(result.override?.perpsWithdraw).toEqual({
      enabled: false,
      tokens: undefined,
    });
  });

  it('preserves undefined enabled in override when omitted from remote config', () => {
    const state = cloneDeep(mockedEmptyFlagsState);
    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmations_pay_post_quote: {
          default: { enabled: true },
          override: {
            predictWithdraw: {
              tokens: {
                '0x1': ['0xaaa'],
              },
            },
          },
        },
      };

    const result = selectPayPostQuoteFlags(state);
    expect(result.override?.predictWithdraw.enabled).toBeUndefined();
    expect(result.override?.predictWithdraw.tokens).toEqual({
      '0x1': ['0xaaa'],
    });
  });
});

describe('resolvePayPostQuoteConfig', () => {
  const flags: PayPostQuoteFlags = {
    default: {
      enabled: true,
      tokens: {
        '0x1': ['0xaaa' as Hex],
      },
    },
    override: {
      predictWithdraw: {
        enabled: true,
        tokens: {
          '0x89': ['0xbbb' as Hex],
        },
      },
      perpsWithdraw: {
        enabled: false,
      },
    },
  };

  it('returns default config when no override key is provided', () => {
    const result = resolvePayPostQuoteConfig(flags);
    expect(result).toBe(flags.default);
  });

  it('returns default config when override key does not exist', () => {
    const result = resolvePayPostQuoteConfig(flags, 'unknownType');
    expect(result).toBe(flags.default);
  });

  it('uses override value when override key has that property', () => {
    const result = resolvePayPostQuoteConfig(flags, 'predictWithdraw');
    expect(result.tokens).toEqual({ '0x89': ['0xbbb'] });
    expect(result.enabled).toBe(true);
  });

  it('falls back to default for properties not defined in override', () => {
    const result = resolvePayPostQuoteConfig(flags, 'perpsWithdraw');
    expect(result.enabled).toBe(false);
    expect(result.tokens).toEqual({ '0x1': ['0xaaa'] });
  });

  it('inherits enabled from default when override omits enabled', () => {
    const flagsWithOmittedEnabled: PayPostQuoteFlags = {
      default: {
        enabled: true,
        tokens: { '0x1': ['0xaaa' as Hex] },
      },
      override: {
        predictWithdraw: {
          tokens: { '0x89': ['0xbbb' as Hex] },
        },
      },
    };
    const result = resolvePayPostQuoteConfig(
      flagsWithOmittedEnabled,
      'predictWithdraw',
    );
    expect(result.enabled).toBe(true);
    expect(result.tokens).toEqual({ '0x89': ['0xbbb'] });
  });

  it('returns disabled default when flags is undefined', () => {
    const result = resolvePayPostQuoteConfig(undefined);
    expect(result).toEqual({ enabled: false });
  });
});
