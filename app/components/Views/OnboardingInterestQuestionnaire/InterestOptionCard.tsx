import React from 'react';
import {
  Image,
  type ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { InterestSelectionIndicator } from './InterestSelectionIndicator';

interface InterestOptionCardProps {
  labelKey: string;
  imageSource: ImageSourcePropType;
  isSelected: boolean;
  onPress: () => void;
  testID: string;
}

export const InterestOptionCard = ({
  labelKey,
  imageSource,
  isSelected,
  onPress,
  testID,
}: InterestOptionCardProps) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={tw.style(
        'min-h-[120px] flex-1 overflow-hidden rounded-xl bg-background-muted p-3',
        isSelected
          ? 'border border-border-default bg-background-muted-hover'
          : 'border border-muted',
      )}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        justifyContent={BoxJustifyContent.Between}
        twClassName="min-h-[96px] flex-1"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Start}
        >
          <Image
            source={imageSource}
            style={tw.style('h-10 w-10')}
            resizeMode="contain"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
          <InterestSelectionIndicator isSelected={isSelected} />
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          style={tw.style('mt-2 shrink')}
        >
          {strings(labelKey)}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};
