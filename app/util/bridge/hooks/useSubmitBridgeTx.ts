import type {
  MetaMetricsSwapsEventSource,
  QuoteMetadata,
  QuoteResponse,
} from '@metamask/bridge-controller';
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
    quoteResponse: QuoteResponse & QuoteMetadata;
    /** The entry point from which the user initiated the swap or bridge */
    location?: MetaMetricsSwapsEventSource;
  }) => {
    if (!walletAddress) {
      throw new Error('Wallet address is not set');
    }

    // check whether quoteResponse is an intent transaction
    if (quoteResponse.quote.intent) {
      return Engine.context.BridgeStatusController.submitIntent({
        quoteResponse,
        accountAddress: walletAddress,
        location,
        abTests,
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
