import { PPOMController } from '@metamask/ppom-validator';
import { TransactionController } from '@metamask/transaction-controller';
import { SignatureController } from '@metamask/signature-controller';
import Logger from '../../util/Logger';

export const PPOMResponses: Map<string, any> = new Map<string, any>();

/*
 * Middleware function that handles JSON RPC requests.
 *
 * This function will be called for every JSON RPC request.
 * It will call the PPOM to check if the request is malicious or benign.
 * If the request is benign, it will be forwarded to the next middleware.
 * If the request is malicious or warning, it will trigger the PPOM alert dialog,
 * after the user has confirmed or rejected the request,
 * the request will be forwarded to the next middleware, together with the PPOM response.
 */
export function createPPOMMiddleware(
  ppomController: PPOMController,
  transactionController: TransactionController,
  signatureController: SignatureController,
) {
  return async function PPOMMiddleware(
    req: any,
    _res: any,
    next: (cb?: any) => any,
  ) {
    let messageId: string | undefined;
    let called = false;

    const task = async () => {
      try {
        return await ppomController.usePPOM((ppom) =>
          ppom.validateJsonRpc(req),
        );
      } catch (e) {
        Logger.log(`Error validating JSON RPC using PPOM: ${e}`);
        return;
      }
    };

    const callback = (metadata: any) => {
      if (called) {
        return;
      }

      called = true;
      messageId = metadata.id || metadata.metamaskId;
      if (messageId) {
        PPOMResponses.set(messageId, task());
      }
    };

    transactionController.hub.prependOnceListener(
      `unapprovedTransaction`,
      callback,
    );
    signatureController.hub.prependOnceListener(`unapprovedMessage`, callback);
    signatureController.hub.prependOnceListener(
      `unapprovedPersonalMessage`,
      callback,
    );
    signatureController.hub.prependOnceListener(
      `unapprovedTypedMessage`,
      callback,
    );

    next((cb: () => void) => {
      transactionController.hub.removeListener(
        `unapprovedTransaction`,
        callback,
      );
      signatureController.hub.removeListener(`unapprovedMessage`, callback);
      signatureController.hub.removeListener(
        `unapprovedPersonalMessage`,
        callback,
      );
      signatureController.hub.removeListener(
        `unapprovedTypedMessage`,
        callback,
      );

      if (messageId) {
        PPOMResponses.delete(messageId);
      }

      cb();
    });
  };
}
