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
    it('creates controller with initial undefined state', () => {
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

    it('internal state matches initial state', () => {
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

    it('calls updateRemoteFeatureFlags when enabled', () => {
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

    it('does not call updateRemoteFeatureFlagscontroller when controller is disabled', () => {
      const spy = jest.spyOn(
        RemoteFeatureFlagController.prototype,
        'updateRemoteFeatureFlags',
      );

      createRemoteFeatureFlagController({
        state: undefined,
        messenger,
        disabled: true,
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('controller keeps initial extra data into its state', () => {
      const initialState = {
        extraData: true,
      };

      const controller = createRemoteFeatureFlagController({
        // @ts-expect-error giving a wrong initial state
        state: initialState,
        messenger,
        disabled: false,
      });

      expect(controller.state).toStrictEqual({
        cacheTimestamp: 0,
        extraData: true,
        remoteFeatureFlags: {},
      });
    });
  });
});
