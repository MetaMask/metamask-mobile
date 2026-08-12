import {
  isCrossChain,
  StatusTypes as BridgeStatusTypes,
} from '@metamask/bridge-controller';
import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { ActivityListItem, Status } from '../types';

function getBridgeActivityStatus(
  bridgeHistoryItem: BridgeHistoryItem,
): Status | undefined {
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

export function enrichKeyringActivityWithBridge(
  activity: ActivityListItem,
  bridgeHistory?: BridgeHistoryItem,
  subjectAddress?: string,
): ActivityListItem {
  const quote = bridgeHistory?.quote;
  if (
    !bridgeHistory ||
    !quote ||
    !isCrossChain(quote.srcChainId, quote.destChainId)
  ) {
    return activity;
  }

  const fees = 'fees' in activity.data ? activity.data.fees : undefined;
  const status: Status | undefined =
    activity.status === 'failed'
      ? 'failed'
      : getBridgeActivityStatus(bridgeHistory);

  return {
    ...activity,
    type: 'bridge',
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
