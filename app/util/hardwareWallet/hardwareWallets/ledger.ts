import Engine from '../../../core/Engine';
import { createNavigationDetails } from '../../navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

export interface LedgerSignModelNavParams {
  messageParams: any;
  onConfirmationComplete: (confirmed: boolean, rawSignature?: any) => void;
  version: any;
  type: any;
}
export interface LedgerMessageSignModalParams extends LedgerSignModelNavParams {
  deviceId: any;
}

export const signModalNavDetail = async (params: LedgerSignModelNavParams) => {
  const { KeyringController } = Engine.context;
  const ledgerKeyring = await KeyringController.getLedgerKeyring();

  return createNavigationDetails<LedgerMessageSignModalParams>(
    Routes.LEDGER_MESSAGE_SIGN_MODAL,
  )({
    ...params,
    deviceId: ledgerKeyring.deviceId,
  });
};
