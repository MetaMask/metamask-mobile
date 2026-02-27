import type { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { BridgeQuoteResponse } from '../../../components/UI/Bridge/types';
import Engine from '../../../core/Engine';
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
      return Engine.context.BridgeStatusController.submitIntent({
        quoteResponse: {
          ...quoteResponse,
          quote: {
            ...quoteResponse.quote,
            intent: intentData,
          },
        } as unknown as Parameters<
          typeof Engine.context.BridgeStatusController.submitIntent
        >[0]['quoteResponse'],
        accountAddress: walletAddress,
        location,
        abTests,
      } as unknown as Parameters<
        typeof Engine.context.BridgeStatusController.submitIntent
      >[0]);
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
    );
  };

  return { submitBridgeTx };
}
