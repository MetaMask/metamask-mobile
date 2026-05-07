import {
  DelegationController,
  type DelegationControllerMessenger,
} from '@metamask/delegation-controller';
import { getDeleGatorEnvironment } from '../../../Delegation';
import { Hex } from '@metamask/utils';
import { MessengerClientInitFunction } from '../../types';

const getDelegationEnvironment = (chainId: Hex) =>
  getDeleGatorEnvironment(Number(chainId));

/**
 * Initialize the Delegation controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state of the extension.
 * @returns The initialized controller.
 */
export const DelegationControllerInit: MessengerClientInitFunction<
  DelegationController,
  DelegationControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controller = new DelegationController({
    messenger: controllerMessenger,
    state: persistedState.DelegationController,
    getDelegationEnvironment,
  });

  controllerMessenger.registerActionHandler(
    'DelegationController:signDelegation',
    controller.signDelegation.bind(controller),
  );

  return {
    controller,
  };
};
