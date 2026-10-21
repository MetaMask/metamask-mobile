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
import ButtonIconGlass from '../../../../../component-library/components-temp/ButtonIconGlass';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';

interface MarketInsightsViewHeaderProps {
  onBackPress: () => void;
  /** Puts the back button in a glass capsule, for the floating glass header. */
  isGlass?: boolean;
}

const MarketInsightsViewHeader: React.FC<MarketInsightsViewHeaderProps> = ({
  onBackPress,
  isGlass = false,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-2 py-2"
    testID={MarketInsightsSelectorsIDs.VIEW_HEADER}
  >
    {isGlass ? (
      <ButtonIconGlass
        isCapsule
        iconName={IconName.ArrowLeft}
        size={ButtonIconSize.Md}
        onPress={onBackPress}
      />
    ) : (
      <ButtonIcon
        iconName={IconName.ArrowLeft}
        size={ButtonIconSize.Md}
        onPress={onBackPress}
      />
    )}
    <Box twClassName="flex-1 items-center">
      <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
        {strings('market_insights.title')}
      </Text>
    </Box>
    <Box twClassName="w-10" />
  </Box>
);

export default MarketInsightsViewHeader;
