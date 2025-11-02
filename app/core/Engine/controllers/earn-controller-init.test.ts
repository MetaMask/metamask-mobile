import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getEarnControllerMessenger,
  type EarnControllerMessenger,
  EarnControllerInitMessenger,
  getEarnControllerInitMessenger,
} from '../messengers/earn-controller-messenger';
import { ControllerInitRequest } from '../types';
import { earnControllerInit } from './earn-controller-init';
import { EarnController } from '@metamask/earn-controller';

jest.mock('@metamask/earn-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<EarnControllerMessenger, EarnControllerInitMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getEarnControllerMessenger(baseMessenger),
    initMessenger: getEarnControllerInitMessenger(baseMessenger),
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

  // @ts-expect-error: Partial mock.
  baseMessenger.registerActionHandler('NetworkController:getState', () => ({
    selectedNetworkClientId: 'mainnet',
  }));

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
      selectedNetworkClientId: 'mainnet',
    });
  });
});
