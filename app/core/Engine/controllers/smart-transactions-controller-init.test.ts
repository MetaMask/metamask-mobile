import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getSmartTransactionsControllerMessenger,
  type SmartTransactionsControllerMessenger,
} from '../messengers/smart-transactions-controller-messenger';
import { ControllerInitRequest } from '../types';
import { smartTransactionsControllerInit } from './smart-transactions-controller-init';
import { SmartTransactionsController } from '@metamask/smart-transactions-controller';

jest.mock('@metamask/smart-transactions-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<SmartTransactionsControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSmartTransactionsControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('SmartTransactionsControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } =
      smartTransactionsControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(SmartTransactionsController);
  });

  it('passes the proper arguments to the controller', () => {
    smartTransactionsControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(SmartTransactionsController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
      supportedChainIds: expect.any(Array),
      clientId: 'mobile',
      getFeatureFlags: expect.any(Function),
      getMetaMetricsProps: expect.any(Function),
      trackMetaMetricsEvent: expect.any(Function),
      trace: expect.any(Function),
    });
  });
});
