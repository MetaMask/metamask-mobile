import React from 'react';
import { useSelector } from 'react-redux';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { ActivityListItem } from '../../../../util/activity-adapters';
import {
  ActivityDetailsBridgeMetadata,
  ActivityDetailsBridgeExplorerButtons,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsDualAmountHeader,
  ActivityDetailsFeesAndTotal,
  ActivityDetailsFooter,
} from '../components';
import {
  canRenderActivityDetailsDoItAgain,
  useActivityDetailsDoItAgain,
} from '../hooks/useActivityDetailsDoItAgain';
import {
  getBridgeDestinationCaipChainId,
  getBridgeDestinationTxHash,
  getBridgeHistoryItem,
} from './bridgeDetailsUtils';

export function BridgeDetails({
  item,
}: {
  item: Extract<ActivityListItem, { type: 'bridge' }>;
}) {
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const bridgeHistoryItem = getBridgeHistoryItem(item, bridgeHistory);
  const destinationChainId = getBridgeDestinationCaipChainId(
    item.data.destinationToken,
  );
  const destinationHash = getBridgeDestinationTxHash(bridgeHistoryItem);
  const handleDoItAgain = useActivityDetailsDoItAgain({
    sourceToken: item.data.sourceToken,
    destinationToken: item.data.destinationToken,
    fallbackCaipChainId: item.chainId,
  });
  const canDoItAgain = canRenderActivityDetailsDoItAgain(
    item.data.sourceToken,
    item.chainId,
  );

  return (
    <Box twClassName="flex-1">
      <ActivityDetailsDualAmountHeader
        sentToken={item.data.sourceToken}
        receivedToken={item.data.destinationToken}
      />
      <SectionDivider marginVertical={3} />
      <ActivityDetailsBridgeMetadata
        item={item}
        bridgeHistoryItem={bridgeHistoryItem}
        destinationChainId={destinationChainId}
      />
      <SectionDivider marginVertical={3} />
      <ActivityDetailsFeesAndTotal item={item} token={item.data.sourceToken} />
      <Box twClassName="mt-auto pt-4">
        <ActivityDetailsFooter>
          <ActivityDetailsBridgeExplorerButtons
            sourceChainId={item.chainId}
            sourceHash={item.hash}
            destChainId={destinationChainId}
            destHash={destinationHash}
          />
          {canDoItAgain ? (
            <ActivityDetailsDoItAgainButton
              label={strings('activity_details.bridge_again')}
              onPress={handleDoItAgain}
            />
          ) : null}
        </ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
