import {
  FeatureId,
  formatProviderLabel,
  getNativeAssetForChainId,
  type QuoteResponse,
  SortOrder,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import Engine from '../../../../../core/Engine';
import { useLatestBalance } from '../useLatestBalance';
import { useSelector } from 'react-redux';
import {
  selectDestToken,
  selectIsBridge,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import { parsePriceImpact } from '../../utils/getPriceImpactViewData';

export const useTrackAllQuotesSortedEvent = (
  latestSourceBalance?: ReturnType<typeof useLatestBalance>,
) => {
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const smartTransactionsEnabled = useSelector(selectShouldUseSmartTransaction);
  const isBridge = useSelector(selectIsBridge);

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  return (quote: QuoteResponse['quote']) => {
    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      UnifiedSwapBridgeEventName.AllQuotesSorted,
      {
        can_submit: !hasInsufficientBalance,
        price_impact: parsePriceImpact(quote?.priceData?.priceImpact?.amount),
        gas_included: Boolean(quote?.gasIncluded),
        token_symbol_source:
          sourceToken?.symbol ??
          (sourceToken
            ? getNativeAssetForChainId(sourceToken.chainId).symbol
            : ' '),
        token_symbol_destination: destToken?.symbol ?? null,
        stx_enabled: smartTransactionsEnabled,
        feature_id: FeatureId.UNIFIED_SWAP_BRIDGE,
        sort_order: SortOrder.COST_ASC,
        best_quote_provider: isBridge ? formatProviderLabel(quote) : undefined,
      },
    );
  };
};
