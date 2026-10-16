import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  SectionDivider,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';

export const MoneyClaimableRewardsCardTestIds = {
  CONTAINER: 'money-claimable-rewards-card',
  AMOUNT: 'money-claimable-rewards-card-amount',
  CLAIM_BUTTON: 'money-claimable-rewards-card-claim-button',
} as const;

export interface MoneyClaimableRewardsCardProps {
  localizedText: ReferralLocalizedText;
  /** Formatted trade-fee rebate, the amount Claim will open. */
  amount: string;
  privacyMode?: boolean;
  onClaim: () => void;
}

/**
 * Claimable rebate on Money Home. Claim opens Rewards on the earnings tab.
 * The parent mounts this only when a referee's rebate is at least $1.
 */
const MoneyClaimableRewardsCard = ({
  localizedText,
  amount,
  privacyMode = false,
  onClaim,
}: MoneyClaimableRewardsCardProps) => (
  <Box testID={MoneyClaimableRewardsCardTestIds.CONTAINER}>
    <Box twClassName="mx-4 mt-2">
      <Box twClassName="rounded-2xl bg-muted px-4 py-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Box twClassName="flex-1 pr-4">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {localizedText.availableToClaim}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {` \u2022 ${localizedText.mUSD}`}
              </Text>
            </Box>
            <SensitiveText
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
              testID={MoneyClaimableRewardsCardTestIds.AMOUNT}
            >
              {amount}
            </SensitiveText>
          </Box>
          {/* Button applies `self-start` unless it is full width, which would
              override the row's centering, so it is wrapped to stay centered. */}
          <Box>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Lg}
              onPress={onClaim}
              testID={MoneyClaimableRewardsCardTestIds.CLAIM_BUTTON}
            >
              {localizedText.claim}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
    <SectionDivider marginVertical={8} />
  </Box>
);

export default MoneyClaimableRewardsCard;
