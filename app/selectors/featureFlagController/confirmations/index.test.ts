import { ConfirmationRedesignRemoteFlags, selectConfirmationRedesignFlags } from '.';
import mockedEngine from '../../../core/__mocks__/MockedEngine';
import { mockedEmptyFlagsState, mockedUndefinedFlagsState } from '../mocks';

jest.mock('../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

// Mock getFeatureFlagValue function
jest.mock('../env', () => ({
  getFeatureFlagValue: jest.fn((_, defaultValue) => defaultValue)
}));

// Mock process.env values
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.FEATURE_FLAG_REDESIGNED_SIGNATURES = undefined;
  process.env.FEATURE_FLAG_REDESIGNED_STAKING_TRANSACTIONS = undefined;
  process.env.FEATURE_FLAG_REDESIGNED_CONTRACT_INTERACTION = undefined;
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

// Default values from the implementation
const confirmationRedesignFlagsDefaultValues: ConfirmationRedesignRemoteFlags = {
  signatures: true,
  staking_confirmations: false,
  contract_interaction: false,
};

// Define mocked remote values for tests
const mockedConfirmationRedesignFlags: ConfirmationRedesignRemoteFlags = {
  signatures: false,
  staking_confirmations: true,
  contract_interaction: true,
};

// Update the mock state to include our feature flags
jest.mock('../mocks', () => {
  const originalModule = jest.requireActual('../mocks');
  return {
    ...originalModule,
    mockedState: {
      engine: {
        backgroundState: {
          RemoteFeatureFlagController: {
            remoteFeatureFlags: {
              confirmation_redesign: mockedConfirmationRedesignFlags
            }
          }
        }
      }
    }
  };
});

describe('confirmationRedesign Feature flag: selectConfirmationRedesignFlags selector', () => {
  const testFlagValues = (result: unknown, expected: ConfirmationRedesignRemoteFlags) => {
    const {
      signatures,
      staking_confirmations,
      contract_interaction,
    } = result as ConfirmationRedesignRemoteFlags;

    const {
      signatures: expectedSignatures,
      staking_confirmations: expectedStakingConfirmations,
      contract_interaction: expectedContractInteraction,
    } = expected;

    expect(signatures).toEqual(expectedSignatures);
    expect(staking_confirmations).toEqual(expectedStakingConfirmations);
    expect(contract_interaction).toEqual(expectedContractInteraction);
  };

  it('returns default values when empty feature flag state', () => {
    testFlagValues(
      selectConfirmationRedesignFlags(mockedEmptyFlagsState),
      confirmationRedesignFlagsDefaultValues
    );
  });

  it('returns default values when undefined RemoteFeatureFlagController state', () => {
    testFlagValues(
      selectConfirmationRedesignFlags(mockedUndefinedFlagsState),
      confirmationRedesignFlagsDefaultValues
    );
  });
}); 