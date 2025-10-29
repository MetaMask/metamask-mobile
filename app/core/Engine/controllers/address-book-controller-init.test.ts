import { buildControllerInitRequestMock } from '../utils/test-utils';
import { ExtendedControllerMessenger } from '../../ExtendedControllerMessenger';
import {
  getAddressBookControllerMessenger,
  type AddressBookControllerMessenger,
} from '../messengers/address-book-controller-messenger';
import { ControllerInitRequest } from '../types';
import { addressBookControllerInit } from './address-book-controller-init';
import { AddressBookController } from '@metamask/address-book-controller';

jest.mock('@metamask/address-book-controller');

function getInitRequestMock(): jest.Mocked<
  ControllerInitRequest<AddressBookControllerMessenger>
> {
  const baseMessenger = new ExtendedControllerMessenger<never, never>();

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
