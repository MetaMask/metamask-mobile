import { Messenger } from '@metamask/base-controller';
import {
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger,
  ClientConfigApiService,
  EnvironmentType,
} from '@metamask/remote-feature-flag-controller';
import { createRemoteFeatureFlagController } from './utils';
import { v4 as uuidv4 } from 'uuid';

const mockUpdateRemoteFeatureFlags = jest.fn().mockResolvedValue(undefined);

jest.mock('@metamask/remote-feature-flag-controller', () => {
  const originalModule = jest.requireActual(
    '@metamask/remote-feature-flag-controller',
  );
  return {
    ...originalModule,
    RemoteFeatureFlagController: jest.fn().mockImplementation((params) => ({
      updateRemoteFeatureFlags: mockUpdateRemoteFeatureFlags, // Ensures it returns a resolved promise
      ...params, // Ensure that fetchInterval and other params are stored
    })),
    ClientConfigApiService: jest.fn().mockImplementation((params) => ({
      ...params,
    })),
  };
});

describe('RemoteFeatureFlagController utils', () => {
  let messenger: RemoteFeatureFlagControllerMessenger;

  beforeEach(() => {
    messenger =
      new Messenger() as unknown as RemoteFeatureFlagControllerMessenger;
    jest.clearAllMocks();
  });

  describe('createRemoteFeatureFlagController', () => {
    it('calls updateRemoteFeatureFlags when enabled', () => {
      createRemoteFeatureFlagController({
        state: undefined,
        messenger,
        disabled: false,
        getMetaMetricsId: () => uuidv4(),
      });

      expect(mockUpdateRemoteFeatureFlags).toHaveBeenCalled();
    });

    it('does not call updateRemoteFeatureFlagscontroller when controller is disabled', () => {
      createRemoteFeatureFlagController({
        state: undefined,
        messenger,
        disabled: true,
        getMetaMetricsId: () => uuidv4(),
      });

      expect(mockUpdateRemoteFeatureFlags).not.toHaveBeenCalled();
    });

    it('passes fetchInterval to RemoteFeatureFlagController', async () => {
      const fetchInterval = 6000;

      createRemoteFeatureFlagController({
        state: undefined,
        messenger,
        disabled: false,
        getMetaMetricsId: () => uuidv4(),
        fetchInterval,
      });

      // Ensure the constructor was called with fetchInterval
      expect(RemoteFeatureFlagController).toHaveBeenCalledWith(
        expect.objectContaining({ fetchInterval }),
      );
    });
  });

  describe('ClientConfigApiService environment config', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it.each`
      metamaskEnvironment                 | featureFlagEnvironment              | expectedFlagEnv
      ${undefined}                        | ${undefined}                        | ${'dev'}
      ${'local'}                          | ${undefined}                        | ${'dev'}
      ${'pre-release'}                    | ${undefined}                        | ${'rc'}
      ${'production'}                     | ${undefined}                        | ${'prod'}
      ${EnvironmentType.Development}      | ${undefined}                        | ${'dev'}
      ${EnvironmentType.ReleaseCandidate} | ${undefined}                        | ${'rc'}
      ${EnvironmentType.Production}       | ${undefined}                        | ${'prod'}
      ${'local'}                          | ${'pre-release'}                    | ${'rc'}
      ${'pre-release'}                    | ${'production'}                     | ${'prod'}
      ${'production'}                     | ${'local'}                          | ${'dev'}
      ${EnvironmentType.Development}      | ${EnvironmentType.Production}       | ${'prod'}
      ${EnvironmentType.ReleaseCandidate} | ${EnvironmentType.Development}      | ${'dev'}
      ${EnvironmentType.Production}       | ${EnvironmentType.ReleaseCandidate} | ${'rc'}
      ${undefined}                        | ${'local'}                          | ${'dev'}
      ${undefined}                        | ${'pre-release'}                    | ${'rc'}
      ${undefined}                        | ${'production'}                     | ${'prod'}
      ${undefined}                        | ${EnvironmentType.Development}      | ${'dev'}
      ${undefined}                        | ${EnvironmentType.ReleaseCandidate} | ${'rc'}
      ${undefined}                        | ${EnvironmentType.Production}       | ${'prod'}
    `(
      'is instantiated with the correct environment when metamaskEnvironment=$metamaskEnvironment and featureFlagEnvironment=$featureFlagEnvironment',
      ({ metamaskEnvironment, featureFlagEnvironment, expectedFlagEnv }) => {
        process.env.METAMASK_ENVIRONMENT = metamaskEnvironment;
        process.env.FEATURE_FLAG_ENVIRONMENT = featureFlagEnvironment;

        createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
          getMetaMetricsId: () => uuidv4(),
        });

        expect(ClientConfigApiService).toHaveBeenCalledWith(
          expect.objectContaining({
            config: expect.objectContaining({
              environment: expectedFlagEnv,
            }),
          }),
        );
      },
    );
  });
});
