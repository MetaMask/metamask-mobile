import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  type ActivityListItem,
  enrichTokenFromApi,
} from '../../../../util/activity-adapters';
import { useTokensData } from '../../../hooks/useTokensData/useTokensData';
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
import { useActivityDetailsLendAgain } from '../hooks/useActivityDetailsLendAgain';
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
  const rawSourceToken = item.data.sourceToken;
  const rawDestinationToken =
    'destinationToken' in item.data ? item.data.destinationToken : undefined;

  const tokenData = useTokensData(
    [rawSourceToken?.assetId, rawDestinationToken?.assetId].filter(
      (assetId): assetId is string => Boolean(assetId),
    ),
  );
  const sourceToken = enrichTokenFromApi(rawSourceToken, tokenData);
  const destinationToken = enrichTokenFromApi(rawDestinationToken, tokenData);
  const totalToken = sourceToken?.amount ? sourceToken : destinationToken;
  const handleDoItAgain = useActivityDetailsDoItAgain({
    sourceToken,
    destinationToken,
    fallbackCaipChainId: item.chainId,
  });
  // Lending in/out share this template but not its CTA: the swap view can't
  // repeat either action (a deposit carries no destination token, and a
  // withdrawal's source is a non-swappable aToken). A deposit instead re-opens
  // the earn flow with the underlying token; a withdrawal gets no CTA.
  const swapAgainLabel =
    item.type === 'lendingDeposit' || item.type === 'lendingWithdrawal'
      ? undefined
      : getSwapAgainLabel(item.type);
  const isLendingDeposit = item.type === 'lendingDeposit';
  const { canLendAgain, onLendAgain } = useActivityDetailsLendAgain({
    token: isLendingDeposit ? sourceToken : undefined,
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
          {isLendingDeposit && canLendAgain ? (
            <ActivityDetailsDoItAgainButton
              label={strings('activity_details.lend_again')}
              onPress={onLendAgain}
            />
          ) : null}
          {swapAgainLabel && canDoItAgain ? (
            <ActivityDetailsDoItAgainButton
              label={swapAgainLabel}
              onPress={handleDoItAgain}
            />
          ) : null}
        </ActivityDetailsFooter>
      </Box>
    </Box>
  );
}
