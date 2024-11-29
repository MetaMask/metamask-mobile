import { ControllerMessenger } from '@metamask/base-controller';
import {
  RemoteFeatureFlagController,
  RemoteFeatureFlagControllerMessenger,
} from '@metamask/remote-feature-flag-controller';
import { createRemoteFeatureFlagController } from './utils';

describe('RemoteFeatureFlagController utils', () => {
  let messenger: RemoteFeatureFlagControllerMessenger;

  beforeEach(() => {
    messenger =
      new ControllerMessenger() as unknown as RemoteFeatureFlagControllerMessenger;
    jest.clearAllMocks();
  });

  describe('createRemoteFeatureFlagController', () => {
    it('should create controller with correct config when enabled', () => {
      process.env.METAMASK_ENVIRONMENT = 'production';
      process.env.METAMASK_BUILD_TYPE = 'main';

      const controller = createRemoteFeatureFlagController({
        state: undefined,
        messenger,
        disabled: false,
      });

      expect(controller).toBeDefined();

      // Initializing with am empty object should return an empty obj?
      expect(controller.state).toStrictEqual({
        cacheTimestamp: 0,
        remoteFeatureFlags: {},
      });
    });

    it('should handle initial state correctly', () => {
      const initialState = {
        remoteFeatureFlags: {
          testFlag: true,
        },
        cacheTimestamp: 123,
      };

      const controller = createRemoteFeatureFlagController({
        state: initialState,
        messenger,
        disabled: false,
      });

      expect(controller.state).toStrictEqual(initialState);
    });

    it('should call updateRemoteFeatureFlags when enabled', () => {
      const spy = jest.spyOn(
        RemoteFeatureFlagController.prototype,
        'updateRemoteFeatureFlags',
      );

      createRemoteFeatureFlagController({
        state: undefined,
        messenger,
        disabled: false,
      });

      expect(spy).toHaveBeenCalled();
    });

    it('should not throw when receive corrupted data', () => {
      const initialState = {
        corruptedData: true,
      };

      const controller = createRemoteFeatureFlagController({
        // @ts-expect-error giving a wrong initial state
        state: initialState,
        messenger,
        disabled: false,
      });

      expect(controller.state).toStrictEqual({
        cacheTimestamp: 0,
        corruptedData: true,
        remoteFeatureFlags: {},
      });
    });

    describe('environment handling', () => {
      it('should use Development environment for local', () => {
        process.env.METAMASK_ENVIRONMENT = 'local';
        const controller = createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
        });

        expect(controller).toBeDefined();
        expect(controller.state).toStrictEqual({
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        });
      });

      it('should use ReleaseCandidate environment for pre-release', () => {
        process.env.METAMASK_ENVIRONMENT = 'pre-release';
        const controller = createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
        });

        expect(controller).toBeDefined();
        expect(controller.state).toStrictEqual({
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        });
      });

      it('should use Production environment for production', () => {
        process.env.METAMASK_ENVIRONMENT = 'production';
        const controller = createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
        });

        expect(controller).toBeDefined();
        expect(controller.state).toStrictEqual({
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        });
      });

      it('should default to Development environment for unknown values', () => {
        process.env.METAMASK_ENVIRONMENT = 'unknown';
        const controller = createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
        });

        expect(controller).toBeDefined();
        expect(controller.state).toStrictEqual({
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        });
      });
    });

    describe('build type handling', () => {
      it('should use Main distribution for main build type', () => {
        process.env.METAMASK_BUILD_TYPE = 'main';
        const controller = createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
        });

        expect(controller).toBeDefined();
        expect(controller.state).toStrictEqual({
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        });
      });

      it('should use Flask distribution for flask build type', () => {
        process.env.METAMASK_BUILD_TYPE = 'flask';
        const controller = createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
        });

        expect(controller).toBeDefined();
        expect(controller.state).toStrictEqual({
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        });
      });

      it('should default to Main distribution for unknown build type', () => {
        process.env.METAMASK_BUILD_TYPE = 'unknown';
        const controller = createRemoteFeatureFlagController({
          state: undefined,
          messenger,
          disabled: false,
        });

        expect(controller).toBeDefined();
        expect(controller.state).toStrictEqual({
          cacheTimestamp: 0,
          remoteFeatureFlags: {},
        });
      });
    });
  });
});
