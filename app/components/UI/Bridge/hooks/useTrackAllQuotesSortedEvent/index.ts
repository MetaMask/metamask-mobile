import {
  formatProviderLabel,
  getNativeAssetForChainId,
  Quote,
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

  return (quote: Quote) => {
    Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
      UnifiedSwapBridgeEventName.AllQuotesSorted,
      {
        can_submit: !hasInsufficientBalance,
        price_impact: Number(quote?.priceData?.priceImpact ?? '0'),
        gas_included: Boolean(quote?.gasIncluded),
        // @ts-expect-error gas_included_7702 needs to be added to bridge-controller types
        gas_included_7702: Boolean(quote?.gasIncluded7702),
        token_symbol_source:
          sourceToken?.symbol ??
          (sourceToken
            ? getNativeAssetForChainId(sourceToken.chainId).symbol
            : ' '),
        token_symbol_destination: destToken?.symbol ?? null,
        stx_enabled: smartTransactionsEnabled,
        ...(isBridge && {
          sort_order: SortOrder.COST_ASC,
          best_quote_provider: formatProviderLabel(quote),
        }),
      },
    );
  };
};
