import React, { useEffect, useState, useCallback } from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { LeaderboardTrader } from '../../types';
import LeaderboardService from '../../services/LeaderboardService';
import { formatPnL } from '../../utils/formatters';

interface LeaderboardCTAProps {
  /** Callback when the CTA is pressed */
  onPress: () => void;
  /** Maximum number of traders to show (default: 3) */
  maxTraders?: number;
  /** Test ID for the component */
  testID?: string;
}

/**
 * A call-to-action banner showing top traders from the leaderboard
 * Designed to be placed in Swaps and Perps interfaces
 */
const LeaderboardCTA: React.FC<LeaderboardCTAProps> = ({
  onPress,
  maxTraders = 3,
  testID = 'leaderboard-cta',
}) => {
  const tw = useTailwind();
  const [topTraders, setTopTraders] = useState<LeaderboardTrader[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTopTraders = async () => {
      try {
        const traders = await LeaderboardService.getTopTraders(maxTraders);
        setTopTraders(traders.slice(0, maxTraders));
      } catch (error) {
        console.warn('Failed to fetch top traders for CTA:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopTraders();
  }, [maxTraders]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  // Don't render if loading or no traders
  if (isLoading || topTraders.length === 0) {
    return null;
  }

  // Get the top trader's PnL for display
  const topTraderPnL = topTraders[0]?.metadata.pnl30d ?? 0;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} testID={testID}>
      <Box
        twClassName="mx-4 my-3 p-4 bg-muted rounded-xl"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        {/* Left side - Avatars and text */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1"
        >
          {/* Overlapping avatars */}
          <View style={tw.style('flex-row mr-3')}>
            {topTraders.map((trader, index) => (
              <View
                key={trader.id}
                style={tw.style(
                  'w-8 h-8 rounded-full overflow-hidden border-2 border-default',
                  index > 0 && '-ml-2',
                )}
              >
                {trader.images.xs || trader.images.sm ? (
                  <Image
                    source={{ uri: trader.images.xs || trader.images.sm || '' }}
                    style={tw.style('w-full h-full')}
                  />
                ) : (
                  <View
                    style={tw.style(
                      'w-full h-full bg-alternative items-center justify-center',
                    )}
                  >
                    <Icon
                      name={IconName.User}
                      size={IconSize.Sm}
                      color={IconColor.Muted}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Text content */}
          <Box twClassName="flex-1">
            <Text variant={TextVariant.BodyMd}>
              {strings('leaderboard.cta_title')}
            </Text>
            <Text variant={TextVariant.BodySm} twClassName="text-alternative">
              {strings('leaderboard.cta_subtitle', {
                pnl: formatPnL(topTraderPnL),
              })}
            </Text>
          </Box>
        </Box>

        {/* Right side - Arrow icon */}
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.Muted}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default LeaderboardCTA;
