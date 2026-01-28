import React, { useEffect, useState, useCallback } from 'react';
import { View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import LinearGradient from 'react-native-linear-gradient';
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

const styles = StyleSheet.create({
  gradient: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

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
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} testID={testID}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#A855F7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <View style={styles.contentContainer}>
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
                    'w-8 h-8 rounded-full overflow-hidden border-2 border-white',
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
                        'w-full h-full bg-white/20 items-center justify-center',
                      )}
                    >
                      <Icon
                        name={IconName.User}
                        size={IconSize.Sm}
                        color={IconColor.Alternative}
                      />
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Text content */}
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} twClassName="text-white font-semibold">
                {strings('leaderboard.cta_title')}
              </Text>
              <Text variant={TextVariant.BodySm} twClassName="text-white/80">
                {strings('leaderboard.cta_subtitle', {
                  pnl: formatPnL(topTraderPnL),
                })}
              </Text>
            </Box>
          </Box>

          {/* Right side - Arrow icon */}
          <View style={tw.style('bg-white/20 rounded-full p-2')}>
            <Icon
              name={IconName.ArrowRight}
              size={IconSize.Sm}
              color={IconColor.Inverse}
            />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default LeaderboardCTA;
