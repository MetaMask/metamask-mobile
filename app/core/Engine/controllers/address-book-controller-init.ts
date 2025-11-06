import { ControllerInitFunction } from '../types';
import { AddressBookController } from '@metamask/address-book-controller';
import { AddressBookControllerMessenger } from '../messengers/address-book-controller-messenger';

/**
 * Initialize the address book controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const addressBookControllerInit: ControllerInitFunction<
  AddressBookController,
  AddressBookControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new AddressBookController({
    messenger: controllerMessenger,
    state: persistedState.AddressBookController,
  });

  return {
    controller,
  };
};
