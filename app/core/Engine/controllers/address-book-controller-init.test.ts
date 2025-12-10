import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedMessenger } from '../../ExtendedMessenger';
import { getAddressBookControllerMessenger } from '../messengers/address-book-controller-messenger';
import { ControllerInitRequest } from '../types';
import { addressBookControllerInit } from './address-book-controller-init';
import {
  AddressBookController,
  type AddressBookControllerMessenger,
} from '@metamask/address-book-controller';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';

jest.mock('@metamask/address-book-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<AddressBookControllerMessenger>
> {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const requestMock = {
    ...buildControllerInitRequestMock(baseMessenger),
    controllerMessenger: getAddressBookControllerMessenger(baseMessenger),
    initMessenger: undefined,
  };

  return requestMock;
}

describe('AddressBookControllerInit', () => {
  it('initializes the controller', () => {
    const { controller } = addressBookControllerInit(getInitRequestMock());
    expect(controller).toBeInstanceOf(AddressBookController);
  });

  it('passes the proper arguments to the controller', () => {
    addressBookControllerInit(getInitRequestMock());

    const controllerMock = jest.mocked(AddressBookController);
    expect(controllerMock).toHaveBeenCalledWith({
      messenger: expect.any(Object),
      state: undefined,
    });
  });
});
