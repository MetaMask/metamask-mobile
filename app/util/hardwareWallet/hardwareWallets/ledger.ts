import { createNavigationDetails } from '../../navigation/navUtils';
import Routes from '../../../constants/navigation/Routes';

export interface LedgerSignModelNavParams {
  messageParams: any;
  onConfirmationComplete: (confirmed: boolean, rawSignature?: any) => void;
  version: any;
  type: any;
}

export const signModalNavDetail = async (params: LedgerSignModelNavParams) =>
  createNavigationDetails<LedgerSignModelNavParams>(
    Routes.LEDGER_MESSAGE_SIGN_MODAL,
  )({
    ...params,
  });
