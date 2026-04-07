import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  IconName,
  ButtonIcon,
  ButtonIconSize,
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
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-2 py-2"
    testID={MarketInsightsSelectorsIDs.VIEW_HEADER}
  >
    <ButtonIcon
      iconName={IconName.ArrowLeft}
      size={ButtonIconSize.Md}
      onPress={onBackPress}
    />
    <Box twClassName="flex-1 items-center">
      <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
        {strings('market_insights.title')}
      </Text>
    </Box>
    <Box twClassName="w-10" />
  </Box>
);

export default MarketInsightsViewHeader;
