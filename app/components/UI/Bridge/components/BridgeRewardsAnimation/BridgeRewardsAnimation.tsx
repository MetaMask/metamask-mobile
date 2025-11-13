import React, { useMemo } from 'react';
import { View } from 'react-native';
import Rive, { Alignment, Fit } from 'rive-react-native';
import Animated from 'react-native-reanimated';
import { Text, TextVariant } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { useTheme } from '../../../../../util/theme';
import { useBridgeRewardsAnimation } from './useBridgeRewardsAnimation';
import { BridgeRewardAnimationState } from './types';
import { bridgeRewardsAnimationStyles } from './BridgeRewardsAnimation.styles';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
const RewardsIconAnimation = require('../../../../../animations/rewards_icon_animations.riv');

interface BridgeRewardsAnimationProps {
  value: number;
  state?: BridgeRewardAnimationState;
}

export const BridgeRewardsAnimation: React.FC<BridgeRewardsAnimationProps> =
  React.memo(
    ({ value, state = BridgeRewardAnimationState.Idle }) => {
      const theme = useTheme();
      const isErrorState = state === BridgeRewardAnimationState.ErrorState;

      // Use default formatting for Bridge
      const formatter = useMemo(() => new Intl.NumberFormat('en-US'), []);

      const {
        riveRef,
        animatedStyle,
        iconPosition,
        displayValue,
        displayText,
        hideValue,
      } = useBridgeRewardsAnimation({
        value,
        state,
      });

      const { styles } = useStyles(bridgeRewardsAnimationStyles, {
        theme,
        isErrorState,
        iconPosition,
      });

      return (
        <View style={styles.container}>
          <View style={styles.riveIcon}>
            <Rive
              ref={riveRef}
              source={RewardsIconAnimation}
              fit={Fit.FitHeight}
              alignment={Alignment.CenterRight}
              style={styles.riveSize}
            />
          </View>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Animated.View style={[styles.textContainer, animatedStyle] as any}>
            <Text variant={TextVariant.BodyMd} style={styles.counterText}>
              {displayText || (hideValue ? '' : formatter.format(displayValue))}
            </Text>
          </Animated.View>
        </View>
      );
    },
    (prevProps, nextProps) =>
      // Only re-render if value or state actually changed
      prevProps.value === nextProps.value &&
      prevProps.state === nextProps.state,
  );

BridgeRewardsAnimation.displayName = 'BridgeRewardsAnimation';
