import { SignTypedDataVersion } from '@metamask/keyring-controller';
import {
  MessageParamsTypedData,
  SignatureControllerMessenger,
} from '@metamask/signature-controller';
import type { Json } from '@metamask/utils';
import { BridgeQuoteResponse } from '../../components/UI/Bridge/types';
import Engine from '../../core/Engine';
import { getSignatureControllerMessenger } from '../../core/Engine/messengers/signature-controller-messenger';

export type IntentTypedData = MessageParamsTypedData;

export async function signIntent({
  from,
  typedData,
  messenger,
}: {
  from: string;
  typedData: IntentTypedData;
  messenger: SignatureControllerMessenger;
}): Promise<string> {
  return await messenger.call(
    'KeyringController:signTypedMessage',
    {
      from,
      data: typedData as unknown as Json,
    },
    SignTypedDataVersion.V4,
  );
}

export async function handleIntentTransaction(
  quoteResponse: BridgeQuoteResponse,
  selectedAccountAddress: string | undefined,
) {
  const signatureControllerMessenger = getSignatureControllerMessenger(
    Engine.controllerMessenger,
  );

  const intent = quoteResponse.quote.intent;
  if (intent) {
    const accountAddress = selectedAccountAddress;
    if (!accountAddress) {
      throw new Error('Missing selected account for intent signing');
    }
    const order = intent.order;
    if (!order) {
      throw new Error('Intent order is missing from quote response');
    }
    if (!intent.typedData) {
      throw new Error('Intent typed data is missing from quote response');
    }

    const signature = await signIntent({
      from: accountAddress,
      typedData: intent.typedData as IntentTypedData,
      messenger: signatureControllerMessenger,
    });

    return Engine.context.BridgeStatusController.submitIntent({
      // TODO: add validation in core to avoid doing this
      quoteResponse: quoteResponse as unknown as Parameters<
        typeof Engine.context.BridgeStatusController.submitIntent
      >[0]['quoteResponse'],
      signature,
      accountAddress,
    });
  }

  throw new Error('Intent transaction is not supported');
}
