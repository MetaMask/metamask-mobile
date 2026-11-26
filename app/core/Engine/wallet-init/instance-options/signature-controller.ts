import type { SignatureControllerOptions } from '@metamask/signature-controller';
import type { WalletOptions } from '@metamask/wallet';
import AppConstants from '../../../AppConstants';
import { trace } from '../../../../util/trace';
import type { SignatureControllerInitMessenger } from '../messengers/signature-controller-messenger';

type SignatureControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['signatureController']
>;

/**
 * Build mobile's client-specific options for the wallet-owned
 * `SignatureController`.
 *
 * @param request - The request object.
 * @param request.initMessenger - Messenger used to read preferences.
 * @returns The mobile SignatureController instance options.
 */
export function getSignatureControllerInstanceOptions({
  initMessenger,
}: {
  initMessenger: SignatureControllerInitMessenger;
}): SignatureControllerInstanceOptions {
  return {
    decodingApiUrl: AppConstants.DECODING_API_URL,
    isDecodeSignatureRequestEnabled: () =>
      initMessenger.call('PreferencesController:getState')
        .useTransactionSimulations,
    trace: trace as unknown as SignatureControllerOptions['trace'],
  };
}
