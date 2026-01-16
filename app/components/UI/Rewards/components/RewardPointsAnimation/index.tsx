import React, { useMemo } from 'react';
import { View } from 'react-native';
import TouchableOpacity from '../../../../Base/TouchableOpacity';
import Rive, { Alignment, Fit } from 'rive-react-native';
import Animated from 'react-native-reanimated';
import {
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import {
  useRewardsAnimation,
  RewardAnimationState,
} from '../../hooks/useRewardsAnimation';
import styleSheet from './index.styles';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const RewardsIconAnimation = require('../../../../../animations/rewards_icon_animations.riv');

/**
 * Animated rewards points display with Rive fox mascot
 * Refer to app/components/UI/Rewards/components/RewardPointsAnimation/index.stories.tsx for usage examples
 *
 * @param value - Points value to display
 * @param bonusBips - Bonus multiplier in basis points (100 = 1%)
 * @param shouldShow - Whether to show the animation (default: true)
 * @param duration - Animation duration in ms (default: 1000)
 * @param variant - Text variant for the points number
 * @param height - Rive icon height (default: 20)
 * @param width - Rive icon width (default: 20)
 * @param state - Animation state (Loading | ErrorState | Idle)
 * @param infoOnPress - Callback for info icon press (shown in error state)
 * @param locale - Locale for number formatting (default: 'en-US')
 * @param formatOptions - Intl.NumberFormat options for customizing number display
 */
interface RewardPointsAnimationProps {
  value: number;
  bonusBips?: number;
  shouldShow?: boolean;
  duration?: number;
  variant?: TextVariant;
  height?: number;
  width?: number;
  state?: RewardAnimationState;
  infoOnPress?: () => void;
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

const RewardPointsAnimation: React.FC<RewardPointsAnimationProps> = ({
  value,
  shouldShow = true,
  duration = 1000,
  variant = TextVariant.BodyMd,
  height = 16,
  width = 16,
  state = RewardAnimationState.Idle,
  infoOnPress,
  locale = 'en-US',
  formatOptions,
}) => {
  const theme = useTheme();
  const isErrorState = state === RewardAnimationState.ErrorState;

  // Create number formatter with provided options
  const formatter = useMemo(
    () => new Intl.NumberFormat(locale, formatOptions),
    [locale, formatOptions],
  );

  // Format the display value
  const formattedValue = useMemo(
    () => formatter.format(value),
    [formatter, value],
  );

  // Calculate container width to prevent layout jitter during animation
  const containerWidth = useMemo(() => {
    const digitCount = formattedValue.length;
    return digitCount === 1 ? 14 : width + digitCount + 20;
  }, [formattedValue, width]);

  const { styles } = useStyles(styleSheet, {
    theme,
    height,
    width,
    isErrorState,
    containerWidth,
  });

  const {
    riveRef,
    animatedStyle,
    rivePositionStyle,
    displayValue,
    displayText,
    hideValue,
  } = useRewardsAnimation({
    value,
    duration,
    state,
  });

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {/* Rive fox animation */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Animated.View style={[styles.riveIcon, rivePositionStyle] as any}>
          <Rive
            ref={riveRef}
            source={RewardsIconAnimation}
            fit={Fit.FitHeight}
            alignment={Alignment.CenterRight}
            style={{ width, height }}
          />
        </Animated.View>

        {/* Animated points number or error text */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Animated.View style={animatedStyle as any}>
          <View style={styles.infoIconContainer}>
            <Text variant={variant} style={styles.counterText}>
              {displayText || (hideValue ? '' : formatter.format(displayValue))}
            </Text>
            {isErrorState && infoOnPress && (
              <TouchableOpacity onPress={infoOnPress}>
                <Icon
                  testID="info-icon"
                  style={styles.infoIcon}
                  name={IconName.Info}
                  size={IconSize.Sm}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
};

export default RewardPointsAnimation;

export { RewardAnimationState };
