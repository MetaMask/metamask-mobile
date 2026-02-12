import React from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
  BoxBackgroundColor,
} from '@metamask/design-system-react-native';
import type { MarketInfo } from '../../../../../UI/Perps/controllers/types';
import PerpsTokenLogo from '../../../../../UI/Perps/components/PerpsTokenLogo';
import PerpsLeverage from '../../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage';

interface PerpsMarketCardProps {
  /** Market info from readOnly API */
  market: MarketInfo;
  /** Callback when card is pressed */
  onPress?: (market: MarketInfo) => void;
}

/**
 * PerpsMarketCard - Compact market card for horizontal scroll display.
 *
 * Displays logo, symbol, and leverage in a small card format.
 * Designed for use with readOnly mode data (MarketInfo).
 */
const PerpsMarketCard = ({ market, onPress }: PerpsMarketCardProps) => {
  const handlePress = () => {
    onPress?.(market);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${market.name} perps market`}
    >
      <Box
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        alignItems={BoxAlignItems.Center}
        padding={3}
        gap={2}
        twClassName="rounded-xl w-20"
      >
        <PerpsTokenLogo
          symbol={market.name}
          size={40}
          recyclingKey={market.name}
        />
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {market.name}
        </Text>
        <PerpsLeverage maxLeverage={`${market.maxLeverage}x`} />
      </Box>
    </TouchableOpacity>
  );
};

export default React.memo(PerpsMarketCard);
