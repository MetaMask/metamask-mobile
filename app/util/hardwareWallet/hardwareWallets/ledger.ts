import { createNavigationDetails } from '../../navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import { getDeviceId } from '../../../core/Ledger/Ledger';
export interface LedgerSignModelNavParams {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageParams: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfirmationComplete: (confirmed: boolean, rawSignature?: any) => void;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  version: any;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any;
}
export interface LedgerMessageSignModalParams extends LedgerSignModelNavParams {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deviceId: any;
}

export const signModalNavDetail = async (params: LedgerSignModelNavParams) => {
  const deviceId = await getDeviceId();
  return createNavigationDetails(Routes.LEDGER_MESSAGE_SIGN_MODAL)({
    ...params,
    deviceId,
  });
};
