import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
import {
  RewardsMoneyController,
  RewardsMoneyControllerMessenger,
} from './RewardsMoneyController';
import { defaultRewardsMoneyControllerState } from './defaultState';
import { rewardsMoneyControllerInit } from '.';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectRewardsMoneyControllerEnabled } from '../../../../selectors/featureFlagController/rewardsMoneyController';

jest.mock('./RewardsMoneyController', () => {
  const actual = jest.requireActual('./RewardsMoneyController');
  return {
    ...actual,
    RewardsMoneyController: jest.fn(),
  };
});
jest.mock('../../../../selectors/settings');
jest.mock('../../../../selectors/featureFlagController/rewardsMoneyController');

describe('rewardsMoneyControllerInit', () => {
  const rewardsMoneyControllerClassMock = jest.mocked(RewardsMoneyController);
  const selectBasicFunctionalityEnabledMock = jest.mocked(
    selectBasicFunctionalityEnabled,
  );
  const selectRewardsMoneyControllerEnabledMock = jest.mocked(
    selectRewardsMoneyControllerEnabled,
  );

  let initRequestMock: jest.Mocked<
    MessengerClientInitRequest<RewardsMoneyControllerMessenger>
  >;
  let mockControllerInstance: jest.Mocked<RewardsMoneyController>;
  let mockControllerMessenger: jest.Mocked<RewardsMoneyControllerMessenger>;

  beforeEach(() => {
    jest.resetAllMocks();

    mockControllerInstance =
      {} as unknown as jest.Mocked<RewardsMoneyController>;

    mockControllerMessenger = {
      call: jest.fn(),
    } as unknown as jest.Mocked<RewardsMoneyControllerMessenger>;

    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });

    initRequestMock = {
      ...buildMessengerClientInitRequestMock(baseControllerMessenger),
      controllerMessenger:
        mockControllerMessenger as unknown as RewardsMoneyControllerMessenger,
      persistedState: {},
    };

    rewardsMoneyControllerClassMock.mockImplementation(
      () => mockControllerInstance,
    );

    selectBasicFunctionalityEnabledMock.mockReturnValue(true);
    selectRewardsMoneyControllerEnabledMock.mockReturnValue(true);
  });

  it('returns controller instance', () => {
    const result = rewardsMoneyControllerInit(initRequestMock);
    expect(result.controller).toBe(mockControllerInstance);
  });

  it('uses default state when persisted state is not provided', () => {
    rewardsMoneyControllerInit(initRequestMock);

    const constructorArgs = rewardsMoneyControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toBe(defaultRewardsMoneyControllerState);
  });

  it('uses persisted state when provided', () => {
    const persistedState = defaultRewardsMoneyControllerState;
    initRequestMock.persistedState = {
      RewardsMoneyController: persistedState,
    };

    rewardsMoneyControllerInit(initRequestMock);

    const constructorArgs = rewardsMoneyControllerClassMock.mock.calls[0][0];
    expect(constructorArgs.state).toBe(persistedState);
  });

  describe('isDisabled', () => {
    it('returns false when basic functionality and remote flag are enabled', () => {
      rewardsMoneyControllerInit(initRequestMock);

      const isDisabledFn = rewardsMoneyControllerClassMock.mock.calls[0][0]
        .isDisabled as () => boolean;
      expect(isDisabledFn()).toBe(false);
    });

    it('returns true when basic functionality is disabled', () => {
      selectBasicFunctionalityEnabledMock.mockReturnValue(false);

      rewardsMoneyControllerInit(initRequestMock);

      const isDisabledFn = rewardsMoneyControllerClassMock.mock.calls[0][0]
        .isDisabled as () => boolean;
      expect(isDisabledFn()).toBe(true);
    });

    it('returns true when remote flag is disabled', () => {
      selectRewardsMoneyControllerEnabledMock.mockReturnValue(false);

      rewardsMoneyControllerInit(initRequestMock);

      const isDisabledFn = rewardsMoneyControllerClassMock.mock.calls[0][0]
        .isDisabled as () => boolean;
      expect(isDisabledFn()).toBe(true);
    });
  });
});
