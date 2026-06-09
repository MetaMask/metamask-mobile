import React, { useCallback, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import type { PerpsMarketData } from '@metamask/perps-controller';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import PerpsMarketRowItem from '../PerpsMarketRowItem';
import { PerpsWatchlistSelectorsIDs } from '../../Perps.testIds';

interface PerpsSwipeableMarketRowProps {
  market: PerpsMarketData;
  onAdd: (symbol: string) => void;
  onDismiss: (symbol: string) => void;
}

const SWIPE_ACTION_WIDTH = 80;

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketRowWrapper: {
    flex: 1,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 16,
  },
  swipeAction: {
    width: SWIPE_ACTION_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});

interface SwipeActionProps {
  translation: SharedValue<number>;
  backgroundColor: string;
  onPress: () => void;
}

const SwipeAction: React.FC<SwipeActionProps> = ({
  translation,
  backgroundColor,
  onPress,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          translation.value,
          [-SWIPE_ACTION_WIDTH, 0],
          [0, SWIPE_ACTION_WIDTH],
          'clamp',
        ),
      },
    ],
  }));

  return (
    <Animated.View
      style={[styles.swipeAction, { backgroundColor }, animatedStyle]}
    >
      <TouchableOpacity style={styles.swipeActionButton} onPress={onPress}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Inverse}>
          {strings('perps.home.watchlist_dismiss')}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const PerpsSwipeableMarketRow: React.FC<PerpsSwipeableMarketRowProps> = ({
  market,
  onAdd,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const swipeableRef = useRef<SwipeableMethods>(null);

  const handleAdd = useCallback(() => {
    onAdd(market.symbol);
  }, [onAdd, market.symbol]);

  const handleDismiss = useCallback(() => {
    swipeableRef.current?.close();
    onDismiss(market.symbol);
  }, [onDismiss, market.symbol]);

  const renderRightActions = useCallback(
    (_progress: SharedValue<number>, translation: SharedValue<number>) => (
      <SwipeAction
        translation={translation}
        backgroundColor={colors.error.default}
        onPress={handleDismiss}
      />
    ),
    [colors.error.default, handleDismiss],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={SWIPE_ACTION_WIDTH / 2}
      overshootRight={false}
      testID={PerpsWatchlistSelectorsIDs.SWIPEABLE_ROW}
    >
      <View style={styles.rowContainer}>
        <View style={styles.marketRowWrapper}>
          <PerpsMarketRowItem market={market} showBadge />
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: colors.primary.default },
          ]}
          onPress={handleAdd}
          testID={PerpsWatchlistSelectorsIDs.RECOMMENDED_ADD_BUTTON}
          accessibilityLabel={strings('perps.home.watchlist_add')}
        >
          <Text variant={TextVariant.BodySMMedium} color={TextColor.Inverse}>
            {strings('perps.home.watchlist_add')}
          </Text>
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
};

export default React.memo(PerpsSwipeableMarketRow);
