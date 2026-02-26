import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { SignTypedDataVersion } from '@metamask/keyring-controller';
import type { Json } from '@metamask/utils';
import { BridgeQuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
import { getSignatureControllerMessenger } from '../../../core/Engine/messengers/signature-controller-messenger';
import { useSelector } from 'react-redux';
import { selectShouldUseSmartTransaction } from '../../../selectors/smartTransactionsController';
import { selectSourceWalletAddress } from '../../../selectors/bridge';
import { selectAbTestContext } from '../../../core/redux/slices/bridge';

export default function useSubmitBridgeTx() {
  const stxEnabled = useSelector(selectShouldUseSmartTransaction);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const abTestContext = useSelector(selectAbTestContext);

  const abTests = abTestContext?.assetsASSETS2493AbtestTokenDetailsLayout
    ? {
        assetsASSETS2493AbtestTokenDetailsLayout:
          abTestContext.assetsASSETS2493AbtestTokenDetailsLayout,
      }
    : undefined;

  const submitBridgeTx = async ({
    quoteResponse,
    location,
  }: {
    quoteResponse: BridgeQuoteResponse;
    /** The entry point from which the user initiated the swap or bridge */
    location?: MetaMetricsSwapsEventSource;
  }) => {
    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }

    const intentData = quoteResponse.quote.intent ?? quoteResponse.intent;

    // check whether quoteResponse is an intent transaction
    if (intentData) {
      if (!intentData.typedData) {
        throw new Error('Intent typedData is missing');
      }

      const signatureControllerMessenger = getSignatureControllerMessenger(
        Engine.controllerMessenger,
      );
      const signature = await signatureControllerMessenger.call(
        'KeyringController:signTypedMessage',
        {
          from: walletAddress,
          data: intentData.typedData as unknown as Json,
        },
        SignTypedDataVersion.V4,
      );

      const submitIntent = Engine.context.BridgeStatusController
        .submitIntent as (params: {
        quoteResponse: Parameters<
          typeof Engine.context.BridgeStatusController.submitTx
        >[1];
        accountAddress: string;
        location?: MetaMetricsSwapsEventSource;
        signature?: string;
      }) => ReturnType<
        typeof Engine.context.BridgeStatusController.submitIntent
      >;

      return submitIntent({
        quoteResponse: {
          ...quoteResponse,
          quote: {
            ...quoteResponse.quote,
            intent: intentData,
          },
        } as unknown as Parameters<
          typeof Engine.context.BridgeStatusController.submitTx
        >[1],
        accountAddress: walletAddress,
        location,
        abTests,
        signature,
      });
    }
    return Engine.context.BridgeStatusController.submitTx(
      walletAddress,
      {
        ...quoteResponse,
        approval: quoteResponse.approval ?? undefined,
      },
      stxEnabled,
      undefined, // quotesReceivedContext
      location,
      abTests,
    );
  };

  return { submitBridgeTx };
}
