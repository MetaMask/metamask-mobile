import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { ActivityListItem } from '../../../../util/activity-adapters';
import {
  ActivityDetailsBlockExplorerButton,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsDualAmountHeader,
  ActivityDetailsFeesAndTotal,
  ActivityDetailsFooter,
  ActivityDetailsMetadata,
} from '../components';
import {
  canRenderActivityDetailsDoItAgain,
  useActivityDetailsDoItAgain,
} from '../hooks/useActivityDetailsDoItAgain';
import { getSwapAgainLabel } from './swapAgainLabel';

type SwapDetailsItem = Extract<
  ActivityListItem,
  {
    type:
      | 'swap'
      | 'swapIncomplete'
      | 'convert'
      | 'lendingDeposit'
      | 'lendingWithdrawal'
      | 'wrap'
      | 'unwrap';
  }
>;

export function SwapDetails({ item }: { item: SwapDetailsItem }) {
  const { sourceToken } = item.data;
  const destinationToken =
    'destinationToken' in item.data ? item.data.destinationToken : undefined;
  const totalToken = sourceToken?.amount ? sourceToken : destinationToken;
  const handleDoItAgain = useActivityDetailsDoItAgain({
    sourceToken,
    destinationToken,
    fallbackCaipChainId: item.chainId,
  });
  const canDoItAgain = canRenderActivityDetailsDoItAgain(
    sourceToken,
    item.chainId,
  );

  return (
    <Box twClassName="flex-1">
      <ActivityDetailsDualAmountHeader
        sentToken={sourceToken}
        receivedToken={destinationToken}
      />
      <SectionDivider marginVertical={3} />
      <ActivityDetailsMetadata item={item} />
      <SectionDivider marginVertical={3} />
      <ActivityDetailsFeesAndTotal item={item} token={totalToken} fiatOnly />
      <Box twClassName="mt-auto pt-4">
        <ActivityDetailsFooter>
          <ActivityDetailsBlockExplorerButton
            chainId={item.chainId}
            hash={item.hash}
          />
          {canDoItAgain ? (
            <ActivityDetailsDoItAgainButton
              label={getSwapAgainLabel(item.type)}
              onPress={handleDoItAgain}
            />
          ) : null}
        </ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
