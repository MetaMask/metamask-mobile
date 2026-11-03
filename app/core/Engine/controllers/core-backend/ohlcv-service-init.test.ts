import { OHLCVService } from '@metamask/core-backend';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { OHLCV_SUBSCRIPTION_NAMESPACE } from '../../../../constants/ohlcv';
import Logger from '../../../../util/Logger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { ohlcvServiceInit } from './ohlcv-service-init';

jest.mock('../../../../util/Logger');
jest.mock('@metamask/core-backend');
jest.mock('../../../../util/trace');

describe('ohlcvServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const arrangeMocks = () => {
    const baseControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    return buildMessengerClientInitRequestMock(baseControllerMessenger);
  };

  it('subscribes OHLCVService on the ohlcv.v1 namespace', () => {
    const mocks = arrangeMocks();

    const result = ohlcvServiceInit(mocks);

    expect(OHLCVService).toHaveBeenCalledWith({
      messenger: mocks.controllerMessenger,
      subscriptionNamespace: OHLCV_SUBSCRIPTION_NAMESPACE,
      traceFn: expect.any(Function),
    });
    expect(result.controller.init).toHaveBeenCalledTimes(1);
  });

  it('logs initialization messages', () => {
    const mocks = arrangeMocks();

    ohlcvServiceInit(mocks);

    expect(Logger.log).toHaveBeenCalledWith('Initializing OHLCVService');
    expect(Logger.log).toHaveBeenCalledWith('OHLCVService initialized');
  });
});
