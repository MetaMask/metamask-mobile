import { createNavigationDetails } from '../../navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';
import type { TangemSigningModalParams } from '../../../components/UI/TangemModals/TangemSigningModal';

export interface TangemSignModelNavParams {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageParams: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onConfirmationComplete: (confirmed: boolean, rawSignature?: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  version: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type: any;
}

export const signModalNavDetail = async (params: TangemSignModelNavParams) =>
  createNavigationDetails<TangemSigningModalParams>(
    Routes.TANGEM_SIGNING_MODAL,
  )({
    transactionId: params.messageParams?.metamaskId,
    onConfirmationComplete: params.onConfirmationComplete,
  });
