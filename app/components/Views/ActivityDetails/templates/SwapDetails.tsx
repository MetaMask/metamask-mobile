import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
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

type SwapDetailsItem = Extract<
  ActivityListItem,
  {
    type:
      | 'swap'
      | 'convert'
      | 'lendingDeposit'
      | 'lendingWithdrawal'
      | 'wrap'
      | 'unwrap';
  }
>;

export function SwapDetails({ item }: { item: SwapDetailsItem }) {
  const totalToken = item.data.sourceToken?.amount
    ? item.data.sourceToken
    : item.data.destinationToken;
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
              label={strings('activity_details.do_it_again')}
              onPress={handleDoItAgain}
            />
          ) : null}
        </ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
