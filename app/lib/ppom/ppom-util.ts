import Logger from '../../util/Logger';
import Engine from '../../core/Engine';

export const PPOMResponses: Map<string, any> = new Map<string, any>();

export const validateRequest = async (req: any) => {
  try {
    const { PPOMController: ppomController, PreferencesController } =
      Engine.context;
    if (!PreferencesController.state.securityAlertsEnabled) {
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
