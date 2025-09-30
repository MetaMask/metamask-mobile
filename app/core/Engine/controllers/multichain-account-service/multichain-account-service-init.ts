import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  BtcAccountProvider,
  TrxAccountProvider,
} from '@metamask/multichain-account-service';
import { ControllerInitFunction } from '../../types';

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
    providers: [
      new BtcAccountProvider(controllerMessenger),
      new TrxAccountProvider(controllerMessenger),
    ].filter(Boolean),
  });

  return { controller, memStateKey: null, persistedStateKey: null };
};
