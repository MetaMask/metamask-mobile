import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest, getRootExtendedMessenger } from '../../types';
import {
  RewardsController,
  RewardsControllerMessenger,
  defaultRewardsControllerState,
} from './RewardsController';
import { rewardsControllerInit } from '.';

jest.mock('./RewardsController', () => {
  const actualRewardsController = jest.requireActual('./RewardsController');

  return {
    ...actualRewardsController,
    RewardsController: jest.fn(),
  };
});

jest.mock('../../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(),
}));

import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';

describe('rewardsControllerInit', () => {
  const rewardsControllerClassMock = jest.mocked(RewardsController);
  const selectBasicFunctionalityEnabledMock = jest.mocked(
    selectBasicFunctionalityEnabled,
  );
  let initRequestMock: jest.Mocked<
    ControllerInitRequest<RewardsControllerMessenger>
  >;

  beforeEach(() => {
    jest.resetAllMocks();
    const baseControllerMessenger = getRootExtendedMessenger();
    // Create controller init request mock
    initRequestMock = buildControllerInitRequestMock(baseControllerMessenger);
  });

  it('returns controller instance', () => {
    expect(rewardsControllerInit(initRequestMock).controller).toBeInstanceOf(
      RewardsController,
    );
  });

  it('controller state should be default state when no initial state is passed in', () => {
    const actualDefaultState = jest.requireActual(
      './RewardsController',
    ).defaultRewardsControllerState;

    rewardsControllerInit(initRequestMock);

    const rewardsControllerState =
      rewardsControllerClassMock.mock.calls[0][0].state;

    expect(rewardsControllerState).toEqual(actualDefaultState);
  });

  it('controller state should be initial state when initial state is passed in', () => {
    const initialRewardsControllerState = {
      ...defaultRewardsControllerState,
      isLoggedIn: true,
    };

    initRequestMock.persistedState = {
      ...initRequestMock.persistedState,
      RewardsController: initialRewardsControllerState,
    };

    rewardsControllerInit(initRequestMock);

    const rewardsControllerState =
      rewardsControllerClassMock.mock.calls[0][0].state;

    expect(rewardsControllerState).toStrictEqual(initialRewardsControllerState);
  });

  describe('isDisabled callback', () => {
    it('should return true when basicFunctionalityEnabled is false', () => {
      selectBasicFunctionalityEnabledMock.mockReturnValue(false);

      rewardsControllerInit(initRequestMock);

      const isDisabledCallback =
        rewardsControllerClassMock.mock.calls[0][0].isDisabled;

      expect(isDisabledCallback?.()).toBe(true);
    });

    it('should return false when basicFunctionalityEnabled is true', () => {
      selectBasicFunctionalityEnabledMock.mockReturnValue(true);

      rewardsControllerInit(initRequestMock);

      const isDisabledCallback =
        rewardsControllerClassMock.mock.calls[0][0].isDisabled;

      expect(isDisabledCallback?.()).toBe(false);
    });
  });
});
