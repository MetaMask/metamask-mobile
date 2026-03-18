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
import { isHardwareAccount } from '../../../util/address';

/**
 * For hardware wallet accounts, strip 7702/gasless from the quote so the
 * controller never executes gas sponsorship for HW.
 */
function normalizeQuoteForSubmit(
  quoteResponse: QuoteResponse & QuoteMetadata,
  walletAddress: string,
): QuoteResponse & QuoteMetadata {
  if (!isHardwareAccount(walletAddress)) {
    return quoteResponse;
  }
  return {
    ...quoteResponse,
    quote: {
      ...quoteResponse.quote,
      gasIncluded7702: false,
      gasIncluded: false,
      gasSponsored: false,
    },
  };
}

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

    const normalizedQuote = normalizeQuoteForSubmit(
      quoteResponse,
      walletAddress,
    );

    // check whether quoteResponse is an intent transaction
    if (normalizedQuote.quote.intent) {
      return Engine.context.BridgeStatusController.submitIntent({
        quoteResponse: normalizedQuote,
        accountAddress: walletAddress,
        location,
        abTests,
      });
    }
    return Engine.context.BridgeStatusController.submitTx(
      walletAddress,
      {
        ...normalizedQuote,
        approval: normalizedQuote.approval ?? undefined,
      },
      stxEnabled,
      undefined, // quotesReceivedContext
      location,
      abTests,
    );
  };

  return { submitBridgeTx };
}
