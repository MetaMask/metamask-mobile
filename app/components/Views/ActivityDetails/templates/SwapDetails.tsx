import React from 'react';
import { Box, SectionDivider } from '@metamask/design-system-react-native';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import {
  type ActivityListItem,
  type TokenAmount,
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

function LendAgainButton({
  token,
  fallbackCaipChainId,
}: {
  token?: TokenAmount;
  fallbackCaipChainId: CaipChainId;
}) {
  const { canLendAgain, onLendAgain } = useActivityDetailsLendAgain({
    token,
    fallbackCaipChainId,
  });

  if (!canLendAgain) {
    return null;
  }

  return (
    <ActivityDetailsDoItAgainButton
      label={strings('activity_details.lend_again')}
      onPress={onLendAgain}
    />
  );
}

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

  const swapAgainLabel =
    item.type === 'lendingDeposit' || item.type === 'lendingWithdrawal'
      ? undefined
      : getSwapAgainLabel(item.type);
  const isLendingDeposit = item.type === 'lendingDeposit';
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
          {isLendingDeposit ? (
            <LendAgainButton
              token={sourceToken}
              fallbackCaipChainId={item.chainId}
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
