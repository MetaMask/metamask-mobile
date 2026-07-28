import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { memo } from 'react';

import type { WalletAssistantPortfolioPlan } from '../../portfolioPlan';

export interface PortfolioPlanCardProps {
  onReview: () => void;
  plan: WalletAssistantPortfolioPlan;
}

const PortfolioPlanCard = ({ onReview, plan }: PortfolioPlanCardProps) => {
  const totalFiatValue = plan.sourceTokens.reduce(
    (total, token) => total + (token.tokenFiatAmount ?? 0),
    0,
  );

  return (
    <Box twClassName="gap-4 rounded-2xl border border-muted bg-muted p-4">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Icon
          name={IconName.Merge}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
        <Box twClassName="min-w-0 flex-1">
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            Consolidate {plan.sourceTokens.length} positions
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {totalFiatValue > 0
              ? `Approximately $${totalFiatValue.toFixed(2)}`
              : 'Use full available balances'}
          </Text>
        </Box>
      </Box>

      {plan.sourceTokens.length > 0 && (
        <Box twClassName="gap-2">
          {plan.sourceTokens.map((token) => (
            <Box
              key={`${token.chainId}:${token.address}`}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              twClassName="rounded-xl bg-default px-3 py-2"
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <AvatarToken
                  name={token.symbol}
                  src={token.image ? { uri: token.image } : undefined}
                  size={AvatarTokenSize.Sm}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {token.symbol}
                </Text>
              </Box>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {token.tokenFiatAmount !== undefined
                  ? `$${token.tokenFiatAmount.toFixed(2)}`
                  : 'Full balance'}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {plan.status === 'ready' ? (
        <>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            gap={2}
          >
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {plan.destinationSymbol}
            </Text>
          </Box>

          {plan.excludedSourceCount > 0 && (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {plan.excludedSourceCount} additional position
              {plan.excludedSourceCount === 1 ? '' : 's'} excluded because Batch
              Swap is currently single-network and limited to five sources.
            </Text>
          )}

          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onReview}
          >
            Review plan
          </Button>
        </>
      ) : (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {plan.status === 'no-matches'
            ? 'No wallet positions were classified as meme coins by MetaMask token data.'
            : `${plan.destinationSymbol} is not currently supported as a Batch Swap destination. No transactions have been prepared.`}
        </Text>
      )}
    </Box>
  );
};

export default memo(PortfolioPlanCard);
