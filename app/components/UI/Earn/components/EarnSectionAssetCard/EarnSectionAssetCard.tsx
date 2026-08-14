import React, { ReactNode } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import EarnSectionCard from '../EarnSectionCard';

export interface EarnSectionAssetCardProps {
  icon: ReactNode;
  tag?: ReactNode;
  primaryText: ReactNode;
  secondaryText: ReactNode;
  tertiaryText: ReactNode;
  tertiaryAccessory?: ReactNode;
  onPress?: () => void;
  testID?: string;
}

const EarnSectionAssetCard = ({
  icon,
  tag,
  primaryText,
  secondaryText,
  tertiaryText,
  tertiaryAccessory,
  onPress,
  testID,
}: EarnSectionAssetCardProps) => (
  <EarnSectionCard onPress={onPress} testID={testID}>
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      justifyContent={BoxJustifyContent.Between}
    >
      {icon}
      {tag}
    </Box>
    <Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        {primaryText}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        numberOfLines={1}
      >
        {secondaryText}
      </Text>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName="mt-1"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.SuccessDefault}
          numberOfLines={1}
        >
          {tertiaryText}
        </Text>
        {tertiaryAccessory}
      </Box>
    </Box>
  </EarnSectionCard>
);

export default EarnSectionAssetCard;
