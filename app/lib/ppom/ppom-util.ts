import Logger from '../../util/Logger';
import Engine from '../../core/Engine';
import { isBlockaidFeatureEnabled } from '../../util/blockaid';

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

const validateRequest = async (req: any) => {
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
    const result = await ppomController.usePPOM((ppom: any) =>
      ppom.validateJsonRpc(req),
    );
    return result;
  } catch (e) {
    Logger.log(`Error validating JSON RPC using PPOM: ${e}`);
    return;
  }
};

export default { validateRequest };
