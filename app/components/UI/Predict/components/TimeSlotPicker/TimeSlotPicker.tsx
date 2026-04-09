import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxBackgroundColor,
  BoxBorderColor,
} from '@metamask/design-system-react-native';
import { PredictMarket } from '../../types';
import { useCountdown } from './useCountdown';
import {
  PULSE_DURATION_MS,
  PULSE_DOT_SIZE,
  PULSE_RING_SIZE,
} from './TimeSlotPicker.constants';
import { TimeSlotPickerProps } from './TimeSlotPicker.types';
import {
  formatTime,
  findLiveMarket,
  findNearestMarket,
} from './TimeSlotPicker.utils';

interface PillStyle {
  bg: BoxBackgroundColor | undefined;
  border: BoxBorderColor | undefined;
  textColor: TextColor;
  bgClassName: string | undefined;
}

const PulseDot: React.FC = () => {
  const tw = useTailwind();
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(1);

  useEffect(() => {
    ringScale.value = withRepeat(
      withTiming(1, {
        duration: PULSE_DURATION_MS,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false,
    );
    ringOpacity.value = withRepeat(
      withTiming(0, {
        duration: PULSE_DURATION_MS,
        easing: Easing.out(Easing.ease),
      }),
      -1,
      false,
    );
  }, [ringScale, ringOpacity]);

  const ringBaseStyle = useMemo(
    () =>
      tw.style(
        `absolute w-[${PULSE_RING_SIZE}px] h-[${PULSE_RING_SIZE}px] rounded-full bg-icon-default/40`,
      ),
    [tw],
  );

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <Box
      twClassName={`w-[${PULSE_RING_SIZE}px] h-[${PULSE_RING_SIZE}px] items-center justify-center`}
    >
      <Animated.View style={[ringBaseStyle, ringAnimatedStyle]} />
      <Box
        twClassName={`w-[${PULSE_DOT_SIZE}px] h-[${PULSE_DOT_SIZE}px] rounded-full bg-error-default`}
      />
    </Box>
  );
};

interface TimeSlotPillProps {
  market: PredictMarket;
  isSelected: boolean;
  isLive: boolean;
  onPress: (market: PredictMarket) => void;
}

const TimeSlotPill: React.FC<TimeSlotPillProps> = ({
  market,
  isSelected,
  isLive,
  onPress,
}) => {
  const tw = useTailwind();
  const countdown = useCountdown(isLive ? market.endDate : undefined);
  const timeLabel = market.endDate ? formatTime(market.endDate) : '';

  const pillStyle = useMemo((): PillStyle => {
    if (isSelected && isLive) {
      return {
        bg: BoxBackgroundColor.ErrorMuted,
        border: BoxBorderColor.ErrorDefault,
        textColor: TextColor.TextDefault,
        bgClassName: undefined,
      };
    }
    if (isSelected) {
      return {
        bg: undefined,
        border: undefined,
        textColor: TextColor.PrimaryInverse,
        bgClassName: 'bg-icon-default',
      };
    }
    return {
      bg: BoxBackgroundColor.BackgroundMuted,
      border: undefined,
      textColor: TextColor.TextDefault,
      bgClassName: undefined,
    };
  }, [isSelected, isLive]);

  const { bg, border, textColor, bgClassName } = pillStyle;

  const handlePress = useCallback(() => {
    onPress(market);
  }, [onPress, market]);

  return (
    <Pressable
      testID={`time-slot-pill-${market.id}`}
      onPress={handlePress}
      style={({ pressed }) => tw.style(pressed && 'opacity-80')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        backgroundColor={bg}
        borderColor={border}
        twClassName={`px-3 py-2 rounded-full gap-2 ${border ? 'border' : ''} ${bgClassName ?? ''}`}
      >
        {isLive && <PulseDot />}
        {isLive && countdown ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text
              testID={`time-slot-live-label-${market.id}`}
              variant={TextVariant.BodySm}
              color={textColor}
              fontWeight={FontWeight.Medium}
            >
              Live
            </Text>
            <Text
              testID={`time-slot-countdown-${market.id}`}
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              fontWeight={FontWeight.Medium}
            >
              {countdown}
            </Text>
          </Box>
        ) : (
          <Text
            testID={`time-slot-time-label-${market.id}`}
            variant={TextVariant.BodySm}
            color={textColor}
            fontWeight={isSelected ? FontWeight.Medium : FontWeight.Regular}
          >
            {timeLabel}
          </Text>
        )}
      </Box>
    </Pressable>
  );
};

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  markets,
  selectedMarketId,
  onMarketSelected,
}) => {
  const tw = useTailwind();
  const scrollRef = useRef<ScrollView>(null);
  const pillPositions = useRef<Map<string, number>>(new Map());
  const lastScrolledId = useRef<string | undefined>(undefined);

  const liveMarket = useMemo(() => findLiveMarket(markets), [markets]);

  const resolvedSelectedId = useMemo(() => {
    if (selectedMarketId) return selectedMarketId;
    if (liveMarket) return liveMarket.id;
    return findNearestMarket(markets)?.id;
  }, [selectedMarketId, liveMarket, markets]);

  const handlePillLayout = useCallback((marketId: string, x: number) => {
    pillPositions.current.set(marketId, x);
  }, []);

  useEffect(() => {
    if (!resolvedSelectedId) return;
    if (lastScrolledId.current === resolvedSelectedId) return;

    const offset = pillPositions.current.get(resolvedSelectedId);
    if (offset !== undefined) {
      scrollRef.current?.scrollTo({ x: offset, animated: true });
      lastScrolledId.current = resolvedSelectedId;
    }
  }, [resolvedSelectedId, markets]);

  if (markets.length === 0) return null;

  return (
    <ScrollView
      testID="time-slot-picker"
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 gap-2')}
    >
      {markets.map((market) => (
        <Box
          key={market.id}
          onLayout={(e) => handlePillLayout(market.id, e.nativeEvent.layout.x)}
        >
          <TimeSlotPill
            market={market}
            isSelected={market.id === resolvedSelectedId}
            isLive={market.id === liveMarket?.id}
            onPress={onMarketSelected}
          />
        </Box>
      ))}
    </ScrollView>
  );
};

export default TimeSlotPicker;
