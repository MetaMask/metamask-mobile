import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import {
  RewardsController,
  RewardsControllerMessenger,
  defaultRewardsControllerState,
} from './RewardsController';
import { rewardsControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { isVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

jest.mock('./RewardsController');
jest.mock('../../../../selectors/settings');
jest.mock('../../../../util/remoteFeatureFlag');

describe('rewardsControllerInit', () => {
  const rewardsControllerClassMock = jest.mocked(RewardsController);
  const selectBasicFunctionalityEnabledMock = jest.mocked(
    selectBasicFunctionalityEnabled,
  );
  const isVersionGatedFeatureFlagMock = jest.mocked(isVersionGatedFeatureFlag);

  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RewardsControllerMessenger>
  >;
  let mockControllerInstance: jest.Mocked<RewardsController>;
  let mockControllerMessenger: jest.Mocked<RewardsControllerMessenger>;
  let mockRemoteFeatureFlagState: Partial<RemoteFeatureFlagControllerState>;

  beforeEach(() => {
    jest.resetAllMocks();

    // Create mock controller instance
    mockControllerInstance = {
      // Add any methods that might be called during initialization
    } as unknown as jest.Mocked<RewardsController>;

    // Initialize default remote feature flag state
    mockRemoteFeatureFlagState = {
      remoteFeatureFlags: {},
    };

    // Create mock controller messenger with proper implementation
    mockControllerMessenger = {
      call: jest.fn().mockImplementation((...args: unknown[]) => {
        const action = args[0] as string;
        if (action === 'RemoteFeatureFlagController:getState') {
          return mockRemoteFeatureFlagState;
        }
        return undefined;
      }),
    } as unknown as jest.Mocked<RewardsControllerMessenger>;

    // Setup base messenger
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    // Create controller init request mock
    initRequestMock = {
      ...buildControllerInitRequestMock(baseControllerMessenger),
      controllerMessenger:
        mockControllerMessenger as unknown as RewardsControllerMessenger,
      persistedState: {},
    };

    // Mock RewardsController constructor
    rewardsControllerClassMock.mockImplementation(() => mockControllerInstance);

    // Default mock return values
    selectBasicFunctionalityEnabledMock.mockReturnValue(true);
    isVersionGatedFeatureFlagMock.mockReturnValue(false);
  });

  describe('basic initialization', () => {
    it('returns controller instance', () => {
      const result = rewardsControllerInit(initRequestMock);
      expect(result.controller).toBe(mockControllerInstance);
    });

    it('creates RewardsController with correct messenger', () => {
      rewardsControllerInit(initRequestMock);

      expect(rewardsControllerClassMock).toHaveBeenCalledTimes(1);
      const constructorArgs = rewardsControllerClassMock.mock.calls[0][0];
      expect(constructorArgs.messenger).toBe(mockControllerMessenger);
    });

    it('uses default state when persisted state is not provided', () => {
      initRequestMock.persistedState = {};

      rewardsControllerInit(initRequestMock);

      const constructorArgs = rewardsControllerClassMock.mock.calls[0][0];
      expect(constructorArgs.state).toBe(defaultRewardsControllerState);
    });

    it('uses persisted state when provided', () => {
      const persistedState = defaultRewardsControllerState;
      initRequestMock.persistedState = {
        RewardsController: persistedState,
      };

      rewardsControllerInit(initRequestMock);

      const constructorArgs = rewardsControllerClassMock.mock.calls[0][0];
      expect(constructorArgs.state).toBe(persistedState);
    });
  });

  describe('isDisabled function', () => {
    it('returns false when basic functionality is enabled', () => {
      selectBasicFunctionalityEnabledMock.mockReturnValue(true);

      rewardsControllerInit(initRequestMock);

      const constructorArgs = rewardsControllerClassMock.mock.calls[0][0];
      const isDisabledFn = constructorArgs.isDisabled as () => boolean;
      expect(isDisabledFn()).toBe(false);
      expect(selectBasicFunctionalityEnabledMock).toHaveBeenCalledWith(
        initRequestMock.getState(),
      );
    });

    it('returns true when basic functionality is disabled', () => {
      selectBasicFunctionalityEnabledMock.mockReturnValue(false);

      rewardsControllerInit(initRequestMock);

      const constructorArgs = rewardsControllerClassMock.mock.calls[0][0];
      const isDisabledFn = constructorArgs.isDisabled as () => boolean;
      expect(isDisabledFn()).toBe(true);
    });
  });
});
