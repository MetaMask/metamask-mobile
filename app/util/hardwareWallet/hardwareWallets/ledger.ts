import { createNavigationDetails } from '../../navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { getDeviceId } from '../../../core/Ledger/Ledger';

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
  const deviceId = await getDeviceId();
  return createNavigationDetails<LedgerMessageSignModalParams>(
    Routes.LEDGER_MESSAGE_SIGN_MODAL,
  )({
    ...params,
    deviceId,
  });
};
