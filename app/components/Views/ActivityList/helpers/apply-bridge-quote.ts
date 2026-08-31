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
  const bridgeStatus =
    activity.status === 'failed'
      ? 'failed'
      : getBridgeActivityStatus(bridgeHistory);
  // A same-chain swap is settled as soon as its keyring transaction confirms,
  // so only bridges take their status from the bridge history.
  const status = isBridge ? bridgeStatus : undefined;

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
        amount: bridgeHistory.status.destChain?.amount ?? quote.destTokenAmount,
        assetId: quote.destAsset.assetId,
        decimals: quote.destAsset.decimals,
        direction: 'in',
        symbol: quote.destAsset.symbol,
      },
      ...(fees === undefined ? {} : { fees }),
    },
  } as ActivityListItem;
}
