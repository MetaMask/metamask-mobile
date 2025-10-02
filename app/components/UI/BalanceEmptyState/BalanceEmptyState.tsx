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
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ButtonHero from '../../../component-library/components-temp/Buttons/ButtonHero';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';

// Bank transfer image from Figma
const bankTransferImage =
  'http://localhost:3845/assets/380bd6dd5c4ed318751b45ce142a72e476987493.png';

/**
 * BalanceEmptyState component displays an empty state for wallet balance
 * with an illustration, title, subtitle, and action button.
 */
const BalanceEmptyState: React.FC<BalanceEmptyStateProps> = ({
  onAction,
  testID = 'balance-empty-state',
  title = 'Fund your wallet',
  subtitle = 'Buy tokens to get started',
  actionText = 'Buy crypto',
}) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="rounded-xl"
      paddingLeft={4}
      paddingRight={4}
      paddingTop={3}
      paddingBottom={3}
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      backgroundColor={BoxBackgroundColor.BackgroundAlternative}
      gap={1}
      testID={testID}
    >
      <Image
        source={{ uri: bankTransferImage }}
        style={tw.style('w-[100px] h-[100px] mb-2')}
        resizeMode="cover"
        testID={`${testID}-image`}
      />
      {/* Content Container */}
      <Box twClassName="flex flex-col items-center gap-5 px-4 w-full">
        {/* Text Content */}
        <Box twClassName="flex flex-col items-center gap-1 w-full max-w-[274px]">
          <Text
            variant={TextVariant.HeadingLg}
            color={TextColor.TextDefault}
            twClassName="text-center"
            testID={`${testID}-title`}
          >
            {title}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={`${testID}-subtitle`}
          >
            {subtitle}
          </Text>
        </Box>
        <ButtonHero
          onPress={onAction}
          testID={`${testID}-action-button`}
          isFullWidth
        >
          {actionText}
        </ButtonHero>
      </Box>
    </Box>
  );
};

export default BalanceEmptyState;
