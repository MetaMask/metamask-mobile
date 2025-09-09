import { cloneDeep } from 'lodash';
import {
  ConfirmationRedesignRemoteFlags,
  selectConfirmationRedesignFlags,
  SendRedesignFlags,
  selectSendRedesignFlags,
  selectMetaMaskPayFlags,
  BUFFER_STEP_DEFAULT,
  BUFFER_INITIAL_DEFAULT,
  ATTEMPTS_MAX_DEFAULT,
  SLIPPAGE_DEFAULT,
  BUFFER_SUBSEQUENT_DEFAULT,
  selectNonZeroUnusedApprovalsAllowList,
} from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.FEATURE_FLAG_REDESIGNED_SIGNATURES = undefined;
  process.env.FEATURE_FLAG_REDESIGNED_STAKING_TRANSACTIONS = undefined;
  process.env.FEATURE_FLAG_REDESIGNED_CONTRACT_DEPLOYMENT = undefined;
  process.env.FEATURE_FLAG_REDESIGNED_CONTRACT_INTERACTION = undefined;
  process.env.FEATURE_FLAG_REDESIGNED_TRANSFER = undefined;
  process.env.MM_SEND_REDESIGN_ENABLED = undefined;
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

const confirmationRedesignFlagsDefaultValues: ConfirmationRedesignRemoteFlags =
  {
    approve: true,
    signatures: true,
    staking_confirmations: true,
    contract_deployment: true,
    contract_interaction: true,
    transfer: true,
  };

const mockedConfirmationRedesignFlags: ConfirmationRedesignRemoteFlags = {
  approve: false,
  signatures: false,
  staking_confirmations: true,
  contract_deployment: true,
  contract_interaction: true,
  transfer: false,
};

const mockedStateWithConfirmationFlags = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          confirmation_redesign: mockedConfirmationRedesignFlags,
        },
        cacheTimestamp: 0,
      },
    },
  },
};

const mockedStateWithPartialFlags = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          confirmation_redesign: {
            signatures: false,
            // Other flags are undefined, should default to true
          },
        },
        cacheTimestamp: 0,
      },
    },
  },
};

describe('Confirmation Redesign Feature Flags', () => {
  const testFlagValues = (
    result: unknown,
    expected: ConfirmationRedesignRemoteFlags,
  ) => {
    const {
      signatures,
      staking_confirmations,
      contract_interaction,
      transfer,
    } = result as ConfirmationRedesignRemoteFlags;

    const {
      signatures: expectedSignatures,
      staking_confirmations: expectedStakingConfirmations,
      contract_interaction: expectedContractInteraction,
      transfer: expectedTransfer,
    } = expected;

    expect(signatures).toEqual(expectedSignatures);
    expect(staking_confirmations).toEqual(expectedStakingConfirmations);
    expect(contract_interaction).toEqual(expectedContractInteraction);
    expect(transfer).toEqual(expectedTransfer);
  };

  it('returns default values (all true) when empty feature flag state', () => {
    testFlagValues(
      selectConfirmationRedesignFlags(mockedEmptyFlagsState),
      confirmationRedesignFlagsDefaultValues,
    );
  });

  it('returns default values (all true) when undefined RemoteFeatureFlagController state', () => {
    testFlagValues(
      selectConfirmationRedesignFlags(mockedUndefinedFlagsState),
      confirmationRedesignFlagsDefaultValues,
    );
  });

  it('returns remote flag values when confirmation_redesign flags are set', () => {
    testFlagValues(
      selectConfirmationRedesignFlags(mockedStateWithConfirmationFlags),
      mockedConfirmationRedesignFlags,
    );
  });

  it('returns mix of remote and default values when only some flags are set', () => {
    const expected: ConfirmationRedesignRemoteFlags = {
      approve: false, // undefined, defaults to false
      signatures: false, // explicitly set to false
      staking_confirmations: true, // undefined, defaults to true
      contract_deployment: true, // undefined, defaults to true
      contract_interaction: true, // undefined, defaults to true
      transfer: true, // undefined, defaults to true
    };

    testFlagValues(
      selectConfirmationRedesignFlags(mockedStateWithPartialFlags),
      expected,
    );
  });

  it('handles kill switch behavior - remote false overrides default true', () => {
    const killSwitchState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              confirmation_redesign: {
                signatures: false, // Kill switch - disables the feature
                staking_confirmations: false,
                contract_interaction: false,
                transfer: false,
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const expectedKillSwitchValues: ConfirmationRedesignRemoteFlags = {
      signatures: false,
      staking_confirmations: false,
      contract_deployment: false,
      contract_interaction: false,
      transfer: false,
      approve: false,
    };

    testFlagValues(
      selectConfirmationRedesignFlags(killSwitchState),
      expectedKillSwitchValues,
    );
  });
});

describe('Send Redesign Feature Flags', () => {
  const sendRedesignFlagsDefaultValues: SendRedesignFlags = {
    enabled: true,
  };

  const mockedSendRedesignFlags: SendRedesignFlags = {
    enabled: false,
  };

  const mockedStateWithSendFlags = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            sendRedesign: mockedSendRedesignFlags,
          },
          cacheTimestamp: 0,
        },
      },
    },
  };

  const testSendFlagValues = (result: unknown, expected: SendRedesignFlags) => {
    const { enabled } = result as SendRedesignFlags;
    const { enabled: expectedEnabled } = expected;

    expect(enabled).toEqual(expectedEnabled);
  };

  it('returns default values (enabled: true) when empty feature flag state', () => {
    testSendFlagValues(
      selectSendRedesignFlags(mockedEmptyFlagsState),
      sendRedesignFlagsDefaultValues,
    );
  });

  it('returns default values (enabled: true) when undefined RemoteFeatureFlagController state', () => {
    testSendFlagValues(
      selectSendRedesignFlags(mockedUndefinedFlagsState),
      sendRedesignFlagsDefaultValues,
    );
  });

  it('returns remote flag values when sendRedesign flags are set', () => {
    testSendFlagValues(
      selectSendRedesignFlags(mockedStateWithSendFlags),
      mockedSendRedesignFlags,
    );
  });

  it('handles kill switch behavior - remote false overrides default true', () => {
    const killSwitchState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              sendRedesign: {
                enabled: false,
              },
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    const expectedKillSwitchValues: SendRedesignFlags = {
      enabled: false,
    };

    testSendFlagValues(
      selectSendRedesignFlags(killSwitchState),
      expectedKillSwitchValues,
    );
  });

  it('returns default when sendRedesign object exists but enabled property is undefined', () => {
    const stateWithUndefinedEnabled = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              sendRedesign: {},
            },
            cacheTimestamp: 0,
          },
        },
      },
    };

    testSendFlagValues(
      selectSendRedesignFlags(stateWithUndefinedEnabled),
      sendRedesignFlagsDefaultValues,
    );
  });
});

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
        confirmation_pay: {
          bufferStep: 1.234,
        },
      };

    expect(selectMetaMaskPayFlags(state).bufferStep).toEqual(1.234);
  });

  it('returns initial buffer from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmation_pay: {
          bufferInitial: 2.345,
        },
      };

    expect(selectMetaMaskPayFlags(state).bufferInitial).toEqual(2.345);
  });

  it('returns subsequent buffer from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmation_pay: {
          bufferSubsequent: 5.678,
        },
      };

    expect(selectMetaMaskPayFlags(state).bufferSubsequent).toEqual(5.678);
  });

  it('returns max attempts from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmation_pay: {
          attemptsMax: 3,
        },
      };

    expect(selectMetaMaskPayFlags(state).attemptsMax).toEqual(3);
  });

  it('returns slippage from feature flag', () => {
    const state = cloneDeep(mockedEmptyFlagsState);

    state.engine.backgroundState.RemoteFeatureFlagController.remoteFeatureFlags =
      {
        confirmation_pay: {
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

  const mockedStateUndefinedAllowList = {
    engine: {
      backgroundState: {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            nonZeroUnusedApprovals: undefined,
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

  it('returns an empty array when the allow list is undefined in remote feature flags', () => {
    const result = selectNonZeroUnusedApprovalsAllowList(
      mockedStateUndefinedAllowList,
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

  it('handles cases where remoteFeatureFlags is undefined', () => {
    const undefinedFeatureFlagsState = {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: undefined,
          },
        },
      },
    };

    const result = selectNonZeroUnusedApprovalsAllowList(
      undefinedFeatureFlagsState,
    );
    expect(result).toEqual([]);
  });
});
