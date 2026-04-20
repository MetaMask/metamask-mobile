import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getEarnControllerMessenger } from '../messengers/earn-controller-messenger';
import { earnControllerInit } from './earn-controller-init';
import { EarnController } from '@metamask/earn-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/earn-controller');

function getInitRequestMock() {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getEarnControllerMessenger(baseMessenger),
  };

  // @ts-expect-error: Partial mock.
  requestMock.getController.mockImplementation((name) => {
    if (name === 'TransactionController') {
      return {
        addTransaction: jest.fn(),
      };
    }

    throw new Error(`Controller "${name}" not found.`);
  });

  return requestMock;
}

describe('EarnControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = earnControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(EarnController);
  });

  it('passes the proper arguments to the controller', () => {
    earnControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(EarnController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      addTransactionFn: expect.any(Function),
    });
  });

  it('calls init() on the controller after construction', () => {
    const { controller } = earnControllerInit(getInitRequestMock());
    expect(controller.init).toHaveBeenCalledTimes(1);
  });
});
