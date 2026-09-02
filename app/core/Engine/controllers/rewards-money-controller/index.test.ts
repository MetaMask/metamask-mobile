import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import type { MessengerClientInitRequest } from '../../types';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { getRewardsMoneyControllerMessenger } from '../../messengers/rewards-money-controller-messenger';
import {
  RewardsMoneyController,
  type RewardsMoneyControllerMessenger,
} from './RewardsMoneyController';
import { defaultRewardsMoneyControllerState } from './defaultState';
import { rewardsMoneyControllerInit } from '.';

jest.mock('./RewardsMoneyController');
jest.mock('../../../../selectors/settings');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<RewardsMoneyControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getRewardsMoneyControllerMessenger(
      baseMessenger as never,
    ),
    initMessenger: undefined,
  };
}

describe('rewardsMoneyControllerInit', () => {
  const controllerClassMock = jest.mocked(RewardsMoneyController);
  const selectBasicFunctionalityEnabledMock = jest.mocked(
    selectBasicFunctionalityEnabled,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    selectBasicFunctionalityEnabledMock.mockReturnValue(true);
  });

  it('initializes the controller', () => {
    const { controller } = rewardsMoneyControllerInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(RewardsMoneyController);
  });

  it('falls back to the default state when nothing is persisted', () => {
    rewardsMoneyControllerInit(getInitRequestMock());

    expect(controllerClassMock).toHaveBeenCalledWith(
      expect.objectContaining({ state: defaultRewardsMoneyControllerState }),
    );
  });

  it('restores persisted controller state', () => {
    const request = getInitRequestMock();
    const persisted = {
      referralMe: null,
      earningsSummary: {},
      earningsLedgerFirstPage: {},
    };
    request.persistedState = {
      RewardsMoneyController: persisted,
    } as typeof request.persistedState;

    rewardsMoneyControllerInit(request);

    expect(controllerClassMock).toHaveBeenCalledWith(
      expect.objectContaining({ state: persisted }),
    );
  });

  it('reports the controller as disabled when basic functionality is off', () => {
    selectBasicFunctionalityEnabledMock.mockReturnValue(false);

    rewardsMoneyControllerInit(getInitRequestMock());
    const { isDisabled } = controllerClassMock.mock.calls[0][0];

    expect(isDisabled?.()).toBe(true);
  });

  it('reports the controller as enabled when basic functionality is on', () => {
    selectBasicFunctionalityEnabledMock.mockReturnValue(true);

    rewardsMoneyControllerInit(getInitRequestMock());
    const { isDisabled } = controllerClassMock.mock.calls[0][0];

    expect(isDisabled?.()).toBe(false);
  });
});
