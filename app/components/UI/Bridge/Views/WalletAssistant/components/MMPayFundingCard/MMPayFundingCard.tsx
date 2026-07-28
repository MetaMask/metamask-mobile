import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { memo } from 'react';

import type { BridgeToken } from '../../../../types';

export interface MMPayFundingCardProps {
  amount?: string;
  destinationSymbol: string;
  destinationToken?: BridgeToken;
  isLoading: boolean;
  networkName: string;
  onAddFunds: () => void;
}

const MMPayFundingCard = ({
  amount,
  destinationSymbol,
  destinationToken,
  isLoading,
  networkName,
  onAddFunds,
}: MMPayFundingCardProps) => (
  <Box twClassName="mt-4 gap-4 rounded-2xl border border-muted bg-muted p-4">
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="min-h-16 rounded-xl border border-muted bg-default px-3 py-2"
    >
      <AvatarToken
        name={destinationToken?.symbol || destinationSymbol || 'Token'}
        src={
          destinationToken?.image ? { uri: destinationToken.image } : undefined
        }
        size={AvatarTokenSize.Md}
      />
      <Box twClassName="min-w-0 flex-1">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          Buy
        </Text>
        <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
          {amount ? `$${amount} of ` : ''}
          {destinationToken?.symbol || destinationSymbol || 'crypto'}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {networkName}
        </Text>
      </Box>
    </Box>
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      No wallet balance is available to make this purchase. Add funds with an
      eligible card, bank account, or another available MetaMask Pay method.
    </Text>
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      isFullWidth
      isDisabled={isLoading}
      startIconName={IconName.Bank}
      onPress={onAddFunds}
    >
      {isLoading ? 'Finding asset…' : 'Add funds'}
    </Button>
  </Box>
);

export default memo(MMPayFundingCard);
