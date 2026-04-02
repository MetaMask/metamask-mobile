import React, { useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';

interface CampaignEntriesClosedBannerProps {
  title: string;
  description: string;
}

/**
 * Absolutely-positioned banner shown at the bottom of the Ondo campaign details
 * page when the deposit cutoff date has passed and opt-in is no longer allowed.
 * Mirrors the visual style of the entries-closed toast.
 */
const CampaignEntriesClosedBanner: React.FC<
  CampaignEntriesClosedBannerProps
> = ({ title, description }) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="absolute bottom-9 left-4 right-4 bg-section border border-border-muted rounded-xl p-3 gap-4"
    >
      <Icon
        name={IconName.Lock}
        size={IconSize.Md}
        color={IconColor.IconDefault}
      />
      <Box twClassName="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
          {title}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {description}
        </Text>
      </Box>
      <ButtonIcon
        iconName={IconName.Close}
        iconProps={{ color: IconColor.IconDefault }}
        onPress={() => setIsVisible(false)}
        testID="campaign-entries-closed-banner-close"
      />
    </Box>
  );
};

export default CampaignEntriesClosedBanner;
