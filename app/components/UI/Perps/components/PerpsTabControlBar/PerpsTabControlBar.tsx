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
import { formatPerpsFiat } from '../../utils/formatUtils';

interface PerpsTabControlBarProps {
  onManageBalancePress?: () => void;
}

export const PerpsTabControlBar: React.FC<PerpsTabControlBarProps> = ({
  onManageBalancePress,
}) => {
  const { styles } = useStyles(styleSheet, {});
  // Use live account data with 1 second throttle for balance display
  const { account: perpsAccount } = usePerpsLiveAccount({ throttleMs: 1000 });

  // Use the reusable hooks
  const { startPulseAnimation, getAnimatedStyle, stopAnimation } =
    useColorPulseAnimation();
  const { compareAndUpdateBalance } = useBalanceComparison();

  // Track previous balance for animation (using availableBalance since that's what we display)
  const previousBalanceRef = useRef<string>('');

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
        startPulseAnimation(balanceChange);
      } catch (animationError) {
        DevLogger.log('PerpsTabControlBar: Animation error:', animationError);
      }
    }

    previousBalanceRef.current = currentBalance;
  }, [perpsAccount, startPulseAnimation, compareAndUpdateBalance]);

  // Cleanup animations on unmount
  useEffect(() => () => stopAnimation(), [stopAnimation]);

  const handlePress = () => {
    onManageBalancePress?.();
  };

  return (
    <TouchableOpacity style={styles.wrapper} onPress={handlePress}>
      <View style={styles.balanceContainer}>
        <Text
          variant={TextVariant.BodySM}
          color={TextColor.Alternative}
          style={styles.titleText}
        >
          {strings('perps.perp_account_balance')}
        </Text>
        <View style={styles.balanceRow}>
          <Animated.View style={[styles.balanceText, getAnimatedStyle]}>
            <Text variant={TextVariant.HeadingSM} color={TextColor.Default}>
              {formatPerpsFiat(perpsAccount?.availableBalance || '0')}
            </Text>
          </Animated.View>
        </View>
      </View>
      <View style={styles.arrowContainer}>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.Alternative}
        />
      </View>
    </TouchableOpacity>
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
