import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import styleSheet from './PerpsTabControlBar.styles';
import { useColorPulseAnimation, useBalanceComparison } from '../../hooks';
import { usePerpsLiveAccount } from '../../hooks/stream';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  formatPerpsFiat,
  formatPnl,
  formatPercentage,
} from '../../utils/formatUtils';

interface PerpsTabControlBarProps {
  onManageBalancePress?: () => void;
}

export const PerpsTabControlBar: React.FC<PerpsTabControlBarProps> = ({
  onManageBalancePress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  // Use live account data with 1 second throttle for balance display
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  // Use the reusable hooks for balance animation
  const {
    startPulseAnimation: startBalancePulse,
    getAnimatedStyle: getBalanceAnimatedStyle,
    stopAnimation: stopBalanceAnimation,
  } = useColorPulseAnimation();
  const { compareAndUpdateBalance } = useBalanceComparison();

  // Use separate animation hook for P&L
  const {
    startPulseAnimation: startPnlPulse,
    getAnimatedStyle: getPnlAnimatedStyle,
    stopAnimation: stopPnlAnimation,
  } = useColorPulseAnimation();

  // Track previous values for animations
  const previousBalanceRef = useRef<string>('');
  const previousPnlRef = useRef<string>('');

  // Animate balance changes
  useEffect(() => {
    if (!perpsAccount) return;

    // Use availableBalance since that's what we display in the UI
    const currentBalance = perpsAccount.availableBalance;

    // Only animate if balance actually changed (and we have a previous value to compare)
    if (
      previousBalanceRef.current &&
      previousBalanceRef.current !== currentBalance
    ) {
      // Compare with previous balance and get animation type
      const balanceChange = compareAndUpdateBalance(currentBalance);

      // Start pulse animation with appropriate color
      try {
        startBalancePulse(balanceChange);
      } catch (animationError) {
        DevLogger.log(
          'PerpsTabControlBar: Balance animation error:',
          animationError,
        );
      }
    }

    previousBalanceRef.current = currentBalance;
  }, [perpsAccount, startBalancePulse, compareAndUpdateBalance]);

  // Animate P&L changes
  useEffect(() => {
    if (!perpsAccount) return;

    const currentPnl = perpsAccount.unrealizedPnl;

    // Only animate if P&L actually changed (and we have a previous value to compare)
    if (previousPnlRef.current && previousPnlRef.current !== currentPnl) {
      const prevPnlNum = parseFloat(previousPnlRef.current);
      const currPnlNum = parseFloat(currentPnl);

      // Determine animation type based on P&L change
      let animationType: 'increase' | 'decrease';
      if (currPnlNum > prevPnlNum) {
        animationType = 'increase';
      } else {
        animationType = 'decrease';
      }

      // Start pulse animation
      try {
        startPnlPulse(animationType);
      } catch (animationError) {
        DevLogger.log(
          'PerpsTabControlBar: P&L animation error:',
          animationError,
        );
      }
    }

    previousPnlRef.current = currentPnl;
  }, [perpsAccount, startPnlPulse]);

  // Cleanup animations on unmount
  useEffect(
    () => () => {
      stopBalanceAnimation();
      stopPnlAnimation();
    },
    [stopBalanceAnimation, stopPnlAnimation],
  );

  const handlePress = () => {
    onManageBalancePress?.();
  };

  const pnlNum = parseFloat(perpsAccount?.unrealizedPnl || '0');
  const pnlColor = pnlNum >= 0 ? TextColor.Success : TextColor.Error;

  return (
    <View style={styles.wrapper}>
      {/* Available Balance Pill */}
      <TouchableOpacity style={styles.pillContainerTop} onPress={handlePress}>
        <View style={styles.leftSection}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.titleText}
          >
            {strings('perps.available_balance')}
          </Text>
        </View>
        <View style={styles.rightSection}>
          <Animated.View style={[getBalanceAnimatedStyle]}>
            <Text
              style={styles.valueText}
              variant={TextVariant.HeadingSM}
              color={TextColor.Default}
            >
              {formatPerpsFiat(perpsAccount?.availableBalance || '0')}
            </Text>
          </Animated.View>
          <Icon
            name={IconName.ArrowRight}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        </View>
      </TouchableOpacity>

      {/* Unrealized P&L Pill */}
      <View style={styles.pillContainerBottom}>
        <View style={styles.leftSection}>
          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Alternative}
            style={styles.titleText}
          >
            {strings('perps.position.account.unrealized_pnl')}
          </Text>
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.Alternative}
            style={styles.infoIcon}
          />
        </View>
        <View style={styles.rightSection}>
          <Animated.View style={[getPnlAnimatedStyle]}>
            <Text
              style={styles.valueText}
              variant={TextVariant.HeadingSM}
              color={pnlColor}
            >
              {formatPnl(perpsAccount?.unrealizedPnl || '0')} (
              {formatPercentage(perpsAccount?.returnOnEquity || '0')})
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

// Enable Why Did You Render in development
// Uncomment to enable WDYR for debugging re-renders
// if (__DEV__) {
//   // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
//   const { shouldEnableWhyDidYouRender } = require('../../../../../../wdyr');
//   if (shouldEnableWhyDidYouRender()) {
//     // @ts-expect-error - whyDidYouRender is added by the WDYR library
//     PerpsTabControlBar.whyDidYouRender = {
//       logOnDifferentValues: true,
//       customName: 'PerpsTabControlBar',
//     };
//   }
// }

export default PerpsTabControlBar;
