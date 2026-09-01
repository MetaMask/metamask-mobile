import {
  isCrossChain,
  StatusTypes as BridgeStatusTypes,
} from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { ActivityListItem } from '../../../../util/activity-adapters';

function getBridgeActivityStatus(bridgeHistoryItem: BridgeHistoryItem) {
  const {
    quote,
    status: { status },
  } = bridgeHistoryItem;

  if (status === BridgeStatusTypes.FAILED) {
    return 'failed';
  }

  if (status === BridgeStatusTypes.COMPLETE) {
    return 'success';
  }

  if (
    isCrossChain(quote.srcChainId, quote.destChainId) &&
    (status === BridgeStatusTypes.PENDING ||
      status === BridgeStatusTypes.SUBMITTED)
  ) {
    return 'pending';
  }

  return undefined;
}

export function applyBridgeQuote(
  activity: ActivityListItem,
  bridgeHistory?: BridgeHistoryItem,
  subjectAddress?: string,
) {
  const quote = bridgeHistory?.quote;
  if (!bridgeHistory || !quote) {
    return activity;
  }

  const isBridge = isCrossChain(quote.srcChainId, quote.destChainId);
  const fees = 'fees' in activity.data ? activity.data.fees : undefined;
  // A same-chain swap is settled as soon as its keyring transaction confirms,
  // so only bridges read status and destination amount from the bridge history.
  let status;
  let destinationAmount = quote.destTokenAmount;

  if (isBridge) {
    status =
      activity.status === 'failed'
        ? 'failed'
        : getBridgeActivityStatus(bridgeHistory);
    destinationAmount =
      bridgeHistory.status.destChain?.amount ?? destinationAmount;
  }

  return {
    ...activity,
    type: isBridge ? 'bridge' : 'swap',
    ...(status ? { status } : {}),
    data: {
      from: subjectAddress,
      sourceToken: {
        amount: quote.srcTokenAmount,
        assetId: quote.srcAsset.assetId,
        decimals: quote.srcAsset.decimals,
        direction: 'out',
        symbol: quote.srcAsset.symbol,
      },
      destinationToken: {
        amount: destinationAmount,
        assetId: quote.destAsset.assetId,
        decimals: quote.destAsset.decimals,
        direction: 'in',
        symbol: quote.destAsset.symbol,
      },
      ...(fees === undefined ? {} : { fees }),
    },
  } as ActivityListItem;
}
