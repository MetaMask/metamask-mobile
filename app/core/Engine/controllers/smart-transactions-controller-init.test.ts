import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import {
  getSmartTransactionsControllerMessenger,
  getSmartTransactionsControllerInitMessenger,
} from '../messengers/smart-transactions-controller-messenger';
import { ControllerInitRequest } from '../types';
import { smartTransactionsControllerInit } from './smart-transactions-controller-init';
import {
  SmartTransactionsController,
  SmartTransactionsControllerMessenger,
} from '@metamask/smart-transactions-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/smart-transactions-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<
    SmartTransactionsControllerMessenger,
    ReturnType<typeof getSmartTransactionsControllerInitMessenger>
  >
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getSmartTransactionsControllerMessenger(baseMessenger),
    initMessenger: getSmartTransactionsControllerInitMessenger(baseMessenger),
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
      getMetaMetricsProps: expect.any(Function),
      trackMetaMetricsEvent: expect.any(Function),
      trace: expect.any(Function),
    });
  });
});
