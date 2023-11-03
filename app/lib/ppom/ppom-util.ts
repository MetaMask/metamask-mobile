import Logger from '../../util/Logger';
import Engine from '../../core/Engine';
import { isBlockaidFeatureEnabled } from '../../util/blockaid';
import {
  Reason,
  ResultType,
} from '../../components/UI/BlockaidBanner/BlockaidBanner.types';
import { store } from '../../store';
import setSignatureRequestSecurityAlertResponse from '../../actions/signatureRequest';
import { updateTransaction } from '../../actions/transaction';

const ConfirmationMethods = Object.freeze([
  'eth_sendRawTransaction',
  'eth_sendTransaction',
  'eth_sign',
  'eth_signTypedData',
  'eth_signTypedData_v1',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
]);

// const validateRequest = async (req: any, transactionMetaId?: string) => {
const validateRequest = async (req: any, _: any) => {
  let securityAlertResponse;
  try {
    const { PPOMController: ppomController, PreferencesController } =
      Engine.context;
    if (
      !isBlockaidFeatureEnabled() ||
      !PreferencesController.state.securityAlertsEnabled ||
      !ConfirmationMethods.includes(req.method)
    ) {
      return;
    }
    securityAlertResponse = await ppomController.usePPOM((ppom: any) =>
      ppom.validateJsonRpc(req),
    );
  } catch (e) {
    Logger.log(`Error validating JSON RPC using PPOM: ${e}`);
    securityAlertResponse = {
      result_type: ResultType.Failed,
      reason: Reason.failed,
      description: 'Validating the confirmation failed by throwing error.',
    };
  } finally {
    if (
      req.method === 'eth_sendRawTransaction' ||
      req.method === 'eth_sendTransaction'
    ) {
      store.dispatch(updateTransaction({ securityAlertResponse }));
      // const { TransactionController } = Engine.context;
      // TransactionController.addTransactionMetaParams(transactionMetaId, {
      //   securityAlertResponse,
      // });
    } else {
      store.dispatch(
        setSignatureRequestSecurityAlertResponse(securityAlertResponse),
      );
    }
  }
};

export default { validateRequest };
