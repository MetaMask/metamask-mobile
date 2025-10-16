import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';
import { ControllerInitFunction } from '../../types';
import Engine from '../../Engine';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../../SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';
import { MultichainAccountServiceInitMessenger } from '../../messengers/multichain-account-service-messenger/multichain-account-service-messenger';

/**
 * Initialize the multichain account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const multichainAccountServiceInit: ControllerInitFunction<
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  MultichainAccountServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const controller = new MultichainAccountService({
    messenger: controllerMessenger,
  });

  // TODO: Move this logic to the SnapKeyring directly.
  initMessenger.subscribe(
    'MultichainAccountService:multichainAccountGroupUpdated',
    (group) => {
      const { AccountTreeController } = Engine.context;

      // If the current group gets updated, then maybe there are more accounts being "selected"
      // now, so we have to forward them to the Snap keyring too!
      if (AccountTreeController.getSelectedAccountGroup() === group.id) {
        // eslint-disable-next-line no-void
        void forwardSelectedAccountGroupToSnapKeyring(group.id);
      }
    },
  );

  return { controller, memStateKey: null, persistedStateKey: null };
};
