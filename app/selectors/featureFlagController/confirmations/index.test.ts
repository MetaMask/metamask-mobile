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
  selectPayQuoteConfig,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../reducers';

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

describe('selectPayQuoteConfig', () => {
  function stateWithFlags(flags: Record<string, unknown>) {
    const state = cloneDeep(mockedEmptyFlagsState);
    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      { confirmations_pay_post_quote: flags };
    return state;
  }

  const baseFlags = {
    default: { enabled: true, tokens: { '0x1': ['0xaaa'] } },
    overrides: {
      predictWithdraw: {
        enabled: true,
        tokens: { '0x89': ['0xbbb'] },
      },
      perpsWithdraw: { enabled: false },
    },
  };

  it('returns default config when no transaction type is provided', () => {
    const state = stateWithFlags(baseFlags);
    const result = selectPayQuoteConfig(state as unknown as RootState);
    expect(result.enabled).toBe(true);
    expect(result.tokens).toEqual({ '0x1': ['0xaaa'] });
  });

  it('returns default config when transaction type does not exist in overrides', () => {
    const state = stateWithFlags(baseFlags);
    const result = selectPayQuoteConfig(
      state as unknown as RootState,
      'unknownType',
    );
    expect(result.enabled).toBe(true);
    expect(result.tokens).toEqual({ '0x1': ['0xaaa'] });
  });

  it('uses override value when transaction type matches', () => {
    const state = stateWithFlags(baseFlags);
    const result = selectPayQuoteConfig(
      state as unknown as RootState,
      'predictWithdraw',
    );
    expect(result.tokens).toEqual({ '0x89': ['0xbbb'] });
    expect(result.enabled).toBe(true);
  });

  it('falls back to default for properties not defined in override', () => {
    const state = stateWithFlags(baseFlags);
    const result = selectPayQuoteConfig(
      state as unknown as RootState,
      'perpsWithdraw',
    );
    expect(result.enabled).toBe(false);
    expect(result.tokens).toEqual({ '0x1': ['0xaaa'] });
  });

  it('inherits enabled from default when override omits enabled', () => {
    const state = stateWithFlags({
      default: { enabled: true, tokens: { '0x1': ['0xaaa'] } },
      overrides: {
        predictWithdraw: { tokens: { '0x89': ['0xbbb'] } },
      },
    });
    const result = selectPayQuoteConfig(
      state as unknown as RootState,
      'predictWithdraw',
    );
    expect(result.enabled).toBe(true);
    expect(result.tokens).toEqual({ '0x89': ['0xbbb'] });
  });

  it('returns disabled default when flag is missing', () => {
    const result = selectPayQuoteConfig(
      mockedEmptyFlagsState as unknown as RootState,
    );
    expect(result).toEqual({ enabled: false, tokens: undefined });
  });
});
