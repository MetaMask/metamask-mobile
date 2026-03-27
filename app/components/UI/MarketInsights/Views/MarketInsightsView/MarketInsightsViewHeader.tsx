import React from 'react';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

interface MarketInsightsViewHeaderProps {
  onBackPress: () => void;
}

const MarketInsightsViewHeader: React.FC<MarketInsightsViewHeaderProps> = ({
  onBackPress,
}) => {
  const tw = useTailwind();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-1 py-2"
      testID={MarketInsightsSelectorsIDs.VIEW_HEADER}
    >
      <Pressable onPress={onBackPress} style={tw.style('p-2')} hitSlop={8}>
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      </Pressable>
      <Box twClassName="flex-1 items-center">
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('market_insights.title')}
        </Text>
      </Box>
      <Box twClassName="w-10" />
    </Box>
  );
};

export default MarketInsightsViewHeader;
