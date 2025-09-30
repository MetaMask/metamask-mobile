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
  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  const btcProvider = new BtcAccountProvider(controllerMessenger);
  /// END:ONLY_INCLUDE_IF

  /// BEGIN:ONLY_INCLUDE_IF(tron)
  const trxProvider = new TrxAccountProvider(controllerMessenger);
  /// END:ONLY_INCLUDE_IF

  const providers = [
    /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
    btcProvider,
    /// END:ONLY_INCLUDE_IF
    /// BEGIN:ONLY_INCLUDE_IF(tron)
    trxProvider,
    /// END:ONLY_INCLUDE_IF
  ].filter(Boolean);

  const controller = new MultichainAccountService({
    messenger: controllerMessenger,
    providers,
  });

  return { controller, memStateKey: null, persistedStateKey: null };
};
