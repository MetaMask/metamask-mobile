import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getRewardsMoneyDataServiceMessenger } from '../messengers/rewards-money-data-service-messenger';
import { MessengerClientInitRequest } from '../types';
import { rewardsMoneyDataServiceInit } from './rewards-money-data-service-init';
import {
  RewardsMoneyDataService,
  RewardsMoneyDataServiceMessenger,
} from './rewards-money-controller/services';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('./rewards-money-controller/services');

function getInitRequestMock(): jest.Mocked<
  MessengerClientInitRequest<RewardsMoneyDataServiceMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getRewardsMoneyDataServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('rewardsMoneyDataServiceInit', () => {
  it('initializes the controller', () => {
    const { controller } = rewardsMoneyDataServiceInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(RewardsMoneyDataService);
  });

  it('passes getBearerToken bound to AuthenticationController', () => {
    rewardsMoneyDataServiceInit(getInitRequestMock());

    const controllerMock = jest.mocked(RewardsMoneyDataService);
    expect(controllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messenger: expect.any(Object),
        locale: expect.any(String),
        fetch: expect.any(Function),
        getBearerToken: expect.any(Function),
      }),
    );
  });

  it('restores persisted env override when rewardsMoneyEnvUrl is set', () => {
    const requestMock = getInitRequestMock();
    const persistedUrl = 'https://uat.rewards-money.example';
    requestMock.persistedState = {
      RewardsMoneyController: { rewardsMoneyEnvUrl: persistedUrl },
    } as typeof requestMock.persistedState;

    const { controller } = rewardsMoneyDataServiceInit(requestMock);

    expect(controller.setRewardsMoneyEnvUrl).toHaveBeenCalledWith(persistedUrl);
  });

  it('does not call setRewardsMoneyEnvUrl when rewardsMoneyEnvUrl is null', () => {
    const requestMock = getInitRequestMock();
    requestMock.persistedState = {
      RewardsMoneyController: { rewardsMoneyEnvUrl: null },
    } as typeof requestMock.persistedState;

    const { controller } = rewardsMoneyDataServiceInit(requestMock);

    expect(controller.setRewardsMoneyEnvUrl).not.toHaveBeenCalled();
  });
});
