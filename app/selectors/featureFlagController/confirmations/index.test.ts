import {
  ConfirmationRedesignRemoteFlags,
  selectConfirmationRedesignFlags,
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
