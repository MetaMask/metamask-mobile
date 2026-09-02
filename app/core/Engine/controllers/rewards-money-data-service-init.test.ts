import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { buildMessengerClientInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getRewardsMoneyDataServiceMessenger } from '../messengers/rewards-money-data-service-messenger';
import type { MessengerClientInitRequest } from '../types';
import { rewardsMoneyDataServiceInit } from './rewards-money-data-service-init';
import {
  RewardsMoneyDataService,
  type RewardsMoneyDataServiceMessenger,
} from './rewards-money-controller/services';

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the service', () => {
    const { controller } = rewardsMoneyDataServiceInit(getInitRequestMock());

    expect(controller).toBeInstanceOf(RewardsMoneyDataService);
  });

  it('passes a base URL, a fetch and a bearer-token getter to the service', () => {
    rewardsMoneyDataServiceInit(getInitRequestMock());

    expect(jest.mocked(RewardsMoneyDataService)).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      fetch: expect.any(Function),
      baseUrl: expect.any(String),
      getBearerToken: expect.any(Function),
      locale: expect.any(String),
    });
  });

  it('resolves the Hydra bearer token from the AuthenticationController', async () => {
    const request = getInitRequestMock();
    const callSpy = jest
      .spyOn(request.controllerMessenger, 'call')
      .mockReturnValue('hydra-token' as never);

    rewardsMoneyDataServiceInit(request);
    const { getBearerToken } = jest.mocked(RewardsMoneyDataService).mock
      .calls[0][0];

    await expect(getBearerToken()).resolves.toBe('hydra-token');
    expect(callSpy).toHaveBeenCalledWith(
      'AuthenticationController:getBearerToken',
    );
  });

  it('resolves undefined when the user is signed out', async () => {
    const request = getInitRequestMock();
    jest.spyOn(request.controllerMessenger, 'call').mockImplementation(() => {
      throw new Error('Not signed in');
    });

    rewardsMoneyDataServiceInit(request);
    const { getBearerToken } = jest.mocked(RewardsMoneyDataService).mock
      .calls[0][0];

    await expect(getBearerToken()).resolves.toBeUndefined();
  });
});
