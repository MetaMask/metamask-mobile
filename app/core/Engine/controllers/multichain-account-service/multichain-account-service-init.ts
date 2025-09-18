import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';
import { ControllerInitFunction } from '../../types';
/// BEGIN:ONLY_INCLUDE_IF(bitcoin)
import { BitcoinAccountProvider } from './providers/BitcoinAccountProvider';
/// END:ONLY_INCLUDE_IF

/**
 * Initialize the multichain account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const multichainAccountServiceInit: ControllerInitFunction<
  MultichainAccountService,
  MultichainAccountServiceMessenger
> = ({ controllerMessenger }) => {
  const controller = new MultichainAccountService({
    messenger: controllerMessenger,
    /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
    providers: [new BitcoinAccountProvider(controllerMessenger)],
    /// END:ONLY_INCLUDE_IF
  });

  return { controller, memStateKey: null, persistedStateKey: null };
};
