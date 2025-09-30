import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  ///: BEGIN:ONLY_INCLUDE_IF(bitcoin)
  BtcAccountProvider,
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  TrxAccountProvider,
  ///: END:ONLY_INCLUDE_IF
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
      /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
      new BtcAccountProvider(controllerMessenger),
      /// END:ONLY_INCLUDE_IF
      /// BEGIN:ONLY_INCLUDE_IF(tron)
      new TrxAccountProvider(controllerMessenger),
      /// END:ONLY_INCLUDE_IF
    ].filter(Boolean),
  });

  return { controller, memStateKey: null, persistedStateKey: null };
};
