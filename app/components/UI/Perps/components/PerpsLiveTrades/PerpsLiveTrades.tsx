import React, { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getHardwareTier } from '../../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../../hooks/useNetworkTier';
import { SocialFeedEmpty, SocialFeedError } from '../../../SocialFeed';
import { PERPS_LIVE_TRADES_CONFIG } from '../../constants/perpsConfig';
import { PerpsHomeViewSelectorsIDs } from '../../Perps.testIds';
import PerpsRowSkeleton from '../PerpsRowSkeleton';
import PerpsLiveTradeRow from './PerpsLiveTradeRow';
import { usePerpsLiveTrades } from './usePerpsLiveTrades';

interface PerpsLiveTradesProps {
  /** Streams only while the section is on screen or close to it. */
  isNearViewport: boolean;
}

const useIsAppActive = () => {
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === 'active',
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) =>
      setIsAppActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  return isAppActive;
};

const PerpsLiveTrades: React.FC<PerpsLiveTradesProps> = ({
  isNearViewport,
}) => {
  const isFocused = useIsFocused();
  const isAppActive = useIsAppActive();
  const networkTier = useNetworkTier();
  const shouldAnimate = useMemo(() => getHardwareTier() !== 'LOW', []);

  const { trades, isLoading, error, refresh } = usePerpsLiveTrades({
    isActive: isNearViewport && isFocused && isAppActive,
    isOffline: networkTier === 'NONE',
  });

  if (isLoading) {
    return <PerpsRowSkeleton count={PERPS_LIVE_TRADES_CONFIG.MaxTrades} />;
  }

  if (error && trades.length === 0) {
    return <SocialFeedError onRetry={() => refresh()} />;
  }

  if (trades.length === 0) {
    return <SocialFeedEmpty />;
  }

  const duration = PERPS_LIVE_TRADES_CONFIG.AnimationDurationMs;

  return (
    <Box testID={PerpsHomeViewSelectorsIDs.LIVE_TRADES_LIST}>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="px-4 pb-2"
      >
        {strings('perps.home.live_trades_subtitle')}
      </Text>
      {/* Rows already loaded appear as-is; only trades added later animate. */}
      <LayoutAnimationConfig skipEntering skipExiting>
        {trades.map((post) => (
          <Animated.View
            key={post.id}
            entering={shouldAnimate ? FadeInUp.duration(duration) : undefined}
            exiting={shouldAnimate ? FadeOut.duration(duration) : undefined}
            layout={
              shouldAnimate ? LinearTransition.duration(duration) : undefined
            }
          >
            <PerpsLiveTradeRow post={post} />
          </Animated.View>
        ))}
      </LayoutAnimationConfig>
    </Box>
  );
};

export default PerpsLiveTrades;
