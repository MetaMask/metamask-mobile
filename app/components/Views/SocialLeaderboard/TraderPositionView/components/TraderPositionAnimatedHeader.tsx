import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AnimationDuration } from '@metamask/design-tokens';
import { HeaderStandard } from '@metamask/design-system-react-native';
import Animated, {
  type SharedValue,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import TraderHeaderIdentity from '../../components/TraderHeaderIdentity';
import type { PerpDirection } from '../../utils/perp';
import { TraderPositionViewSelectorsIDs } from '../TraderPositionView.testIds';
import TraderPositionCompactTokenStats from './TraderPositionCompactTokenStats';

const COMPACT_TITLE_ENTER_OFFSET_PX = 8;
const END_ACCESSORY_SPACER_SIZE = 40;

export interface TraderPositionAnimatedHeaderProps {
  scrollY: SharedValue<number>;
  titleSectionHeight: SharedValue<number>;
  traderName: string;
  traderImageUrl?: string;
  traderAddress?: string;
  symbol: string;
  pricePercentChange: number | undefined;
  activeTimePeriodLabel: string;
  perpDirection?: PerpDirection | null;
  perpLeverage?: number | null;
  onBack: () => void;
  onTraderPress: () => void;
}

const styles = StyleSheet.create({
  centerSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    width: '100%',
  },
  layer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSpacer: {
    height: END_ACCESSORY_SPACER_SIZE,
    width: END_ACCESSORY_SPACER_SIZE,
  },
});

const TraderPositionAnimatedHeader: React.FC<
  TraderPositionAnimatedHeaderProps
> = ({
  scrollY,
  titleSectionHeight,
  traderName,
  traderImageUrl,
  traderAddress,
  symbol,
  pricePercentChange,
  activeTimePeriodLabel,
  perpDirection,
  perpLeverage,
  onBack,
  onTraderPress,
}) => {
  const compactTokenProgress = useDerivedValue(() => {
    const hasMeasured = titleSectionHeight.value > 0;
    const isTokenSectionHidden =
      hasMeasured && scrollY.value >= titleSectionHeight.value;
    return withTiming(isTokenSectionHidden ? 1 : 0, {
      duration: AnimationDuration.Fast,
    });
  });

  const traderLayerStyle = useAnimatedStyle(() => ({
    opacity: 1 - compactTokenProgress.value,
    transform: [
      {
        translateY: compactTokenProgress.value * COMPACT_TITLE_ENTER_OFFSET_PX,
      },
    ],
  }));

  const tokenLayerStyle = useAnimatedStyle(() => ({
    opacity: compactTokenProgress.value,
    transform: [
      {
        translateY:
          (1 - compactTokenProgress.value) * COMPACT_TITLE_ENTER_OFFSET_PX,
      },
    ],
  }));

  const [isTokenHeaderActive, setIsTokenHeaderActive] = useState(false);

  useAnimatedReaction(
    () => compactTokenProgress.value >= 0.5,
    (isActive, previousIsActive) => {
      if (isActive !== previousIsActive) {
        runOnJS(setIsTokenHeaderActive)(isActive);
      }
    },
  );

  return (
    <HeaderStandard
      onBack={onBack}
      backButtonProps={{
        testID: TraderPositionViewSelectorsIDs.BACK_BUTTON,
      }}
      endAccessory={<View style={styles.endSpacer} />}
      testID={TraderPositionViewSelectorsIDs.HEADER}
      twClassName="bg-default"
    >
      <View style={styles.centerSlot}>
        <Animated.View
          style={[styles.layer, traderLayerStyle]}
          pointerEvents={isTokenHeaderActive ? 'none' : 'auto'}
        >
          <TraderHeaderIdentity
            traderName={traderName}
            traderImageUrl={traderImageUrl}
            traderAddress={traderAddress}
            variant="nav"
            onPress={onTraderPress}
            testID={TraderPositionViewSelectorsIDs.TRADER_NAME_LINK}
          />
        </Animated.View>
        <Animated.View
          style={[styles.layer, tokenLayerStyle]}
          pointerEvents={isTokenHeaderActive ? 'auto' : 'none'}
        >
          <TraderPositionCompactTokenStats
            symbol={symbol}
            pricePercentChange={pricePercentChange}
            activeTimePeriodLabel={activeTimePeriodLabel}
            perpDirection={perpDirection}
            perpLeverage={perpLeverage}
            traderName={traderName}
            traderImageUrl={traderImageUrl}
            traderAddress={traderAddress}
            onTraderPress={onTraderPress}
          />
        </Animated.View>
      </View>
    </HeaderStandard>
  );
};

export default TraderPositionAnimatedHeader;
