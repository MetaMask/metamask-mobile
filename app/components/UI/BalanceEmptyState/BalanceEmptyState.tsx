import React from 'react';
import { Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';
import ButtonHero from '../../../component-library/components-temp/Buttons/ButtonHero';

// Bank transfer image from Figma
const bankTransferImage = require('../../../images/bank.transfer.png');

/**
 * BalanceEmptyState component displays an empty state for wallet balance
 * with an illustration, title, subtitle, and action button.
 */
const BalanceEmptyState: React.FC<BalanceEmptyStateProps> = ({
  onAction,
  testID,
  title,
  subtitle,
  actionText,
}) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="rounded-2xl"
      paddingLeft={4}
      paddingRight={4}
      paddingTop={3}
      paddingBottom={4}
      justifyContent={BoxJustifyContent.Center}
      backgroundColor={BoxBackgroundColor.BackgroundSection}
      gap={5}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        gap={1}
        alignItems={BoxAlignItems.Center}
      >
        <Image
          source={bankTransferImage}
          style={tw.style('w-[100px] h-[100px]')}
          resizeMode="cover"
        />
        {title && (
          <Text
            variant={TextVariant.HeadingLg}
            color={TextColor.TextDefault}
            twClassName="text-center"
          >
            {title}
          </Text>
        )}
        {subtitle && (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            fontWeight={FontWeight.Medium}
            twClassName="text-center"
          >
            {subtitle}
          </Text>
        )}
      </Box>
      {actionText && onAction && (
        <ButtonHero onPress={onAction} isFullWidth>
          {actionText}
        </ButtonHero>
      )}
    </Box>
  );
};

export default BalanceEmptyState;
