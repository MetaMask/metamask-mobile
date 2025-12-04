import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { strings } from '../../../../../locales/i18n';
import Icon, {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { ToastContext } from '../../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastOptions,
  ToastVariants,
} from '../../../../component-library/components/Toast/Toast.types';
import { useAppThemeFromContext } from '../../../../util/theme';
import TokenIcon from '../../../Base/TokenIcon';

export type EarnToastOptions = Omit<
  Extract<ToastOptions, { variant: ToastVariants.Icon }>,
  'labelOptions'
> & {
  hapticsType: NotificationFeedbackType;
  // Overwriting ToastOptions.labelOptions to also support ReactNode since this works.
  labelOptions?: {
    label: string | React.ReactNode;
    isBold?: boolean;
  }[];
};

export interface MusdConversionInProgressParams {
  tokenSymbol: string;
  tokenIcon?: string;
  estimatedTimeSeconds?: number;
}

export interface EarnToastOptionsConfig {
  mUsdConversion: {
    inProgress: (params: MusdConversionInProgressParams) => EarnToastOptions;
    success: EarnToastOptions;
    failed: EarnToastOptions;
  };
}

interface EarnToastLabelOptions {
  primary: string | React.ReactNode;
  secondary?: string | React.ReactNode;
  primaryIsBold?: boolean;
}

const getEarnToastLabels = ({
  primary,
  secondary,
  primaryIsBold = true,
}: EarnToastLabelOptions) => {
  const labels = [
    {
      label: primary,
      isBold: primaryIsBold,
    },
  ];

  if (secondary) {
    labels.push(
      {
        label: '\n',
        isBold: false,
      },
      {
        label: secondary,
        isBold: false,
      },
    );
  }

  return labels;
};

const formatEstimatedTime = (seconds?: number): string => {
  if (!seconds || seconds <= 0) {
    return strings('earn.musd_conversion.toasts.eta', { time: '< 1 minute' });
  }

  if (seconds < 60) {
    return strings('earn.musd_conversion.toasts.eta', {
      time: `${seconds} seconds`,
    });
  }

  const minutes = Math.ceil(seconds / 60);
  const minuteText = minutes === 1 ? 'minute' : 'minutes';
  return strings('earn.musd_conversion.toasts.eta', {
    time: `${minutes} ${minuteText}`,
  });
};

const EARN_TOASTS_DEFAULT_OPTIONS: Partial<EarnToastOptions> = {
  hasNoTimeout: false,
  customBottomOffset: 32,
};

const TOKEN_ICON_SIZE = 32;
const RING_STROKE_WIDTH = 4;
// Ring size matches token icon - no gap between icon and ring
const RING_SIZE = TOKEN_ICON_SIZE + RING_STROKE_WIDTH * 2;

const toastStyles = StyleSheet.create({
  tokenIconWithRingContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  spinningRingWrapper: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  tokenIconWrapper: {
    position: 'absolute',
  },
  tokenIcon: {
    width: TOKEN_ICON_SIZE,
    height: TOKEN_ICON_SIZE,
    borderRadius: TOKEN_ICON_SIZE / 2,
  },
  iconWrapper: {
    marginRight: 16,
  },
});

// Spinner configuration
const SPINNER_NUM_SEGMENTS = 18;
const SPINNER_ARC_DEGREES = 360;
const SPINNER_DURATION_MS = 1000;

// Pre-calculate arc paths for the gradient spinner
const SPINNER_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const SPINNER_CENTER = RING_SIZE / 2;
const SEGMENT_DEGREES = SPINNER_ARC_DEGREES / SPINNER_NUM_SEGMENTS;

const createArcPath = (startAngle: number, endAngle: number): string => {
  const startRad = (startAngle * Math.PI) / 180;
  const endRad = (endAngle * Math.PI) / 180;
  const x1 = SPINNER_CENTER + SPINNER_RADIUS * Math.cos(startRad);
  const y1 = SPINNER_CENTER + SPINNER_RADIUS * Math.sin(startRad);
  const x2 = SPINNER_CENTER + SPINNER_RADIUS * Math.cos(endRad);
  const y2 = SPINNER_CENTER + SPINNER_RADIUS * Math.sin(endRad);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${SPINNER_RADIUS} ${SPINNER_RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
};

// Pre-calculate all arc paths and opacities at module load time
const SPINNER_SEGMENTS = Array.from(
  { length: SPINNER_NUM_SEGMENTS },
  (_, i) => ({
    path: createArcPath(i * SEGMENT_DEGREES, (i + 1) * SEGMENT_DEGREES + 1),
    opacity: (i + 1) / SPINNER_NUM_SEGMENTS,
  }),
);

interface GradientSpinnerProps {
  color: string;
}

/**
 * Reusable gradient spinner component
 * Renders a circular arc with gradient opacity that rotates continuously
 */
const GradientSpinner: React.FC<GradientSpinnerProps> = ({ color }) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: SPINNER_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const segments = useMemo(
    () =>
      SPINNER_SEGMENTS.map(({ path, opacity }, i) => (
        <Path
          key={i}
          d={path}
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={RING_STROKE_WIDTH}
          strokeLinecap="butt"
          fill="transparent"
        />
      )),
    [color],
  );

  return (
    <Animated.View style={[toastStyles.spinningRingWrapper, animatedStyle]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        {segments}
      </Svg>
    </Animated.View>
  );
};

interface TokenIconWithSpinnerProps {
  tokenSymbol: string;
  tokenIcon?: string;
}

/**
 * Token icon with a spinning gradient ring around it
 */
const TokenIconWithSpinner: React.FC<TokenIconWithSpinnerProps> = ({
  tokenSymbol,
  tokenIcon,
}) => {
  const { colors } = useAppThemeFromContext();

  return (
    <View style={toastStyles.tokenIconWithRingContainer}>
      <GradientSpinner color={colors.primary.default} />
      <View style={toastStyles.tokenIconWrapper}>
        <TokenIcon
          symbol={tokenSymbol}
          icon={tokenIcon}
          style={toastStyles.tokenIcon}
        />
      </View>
    </View>
  );
};

const useEarnToasts = (): {
  showToast: (config: EarnToastOptions) => void;
  EarnToastOptions: EarnToastOptionsConfig;
} => {
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();

  const closeToast = useCallback(() => {
    toastRef?.current?.closeToast();
  }, [toastRef]);

  const closeButtonOptions = useMemo(
    () => ({
      variant: ButtonIconVariant.Icon,
      iconName: IconName.Close,
      onPress: closeToast,
    }),
    [closeToast],
  );

  const earnBaseToastOptions: Record<string, EarnToastOptions> = useMemo(
    () => ({
      success: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: theme.colors.success.default,
        hapticsType: NotificationFeedbackType.Success,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Icon
              name={IconName.Confirmation}
              color={theme.colors.success.default}
              size={IconSize.Xl}
            />
          </View>
        ),
      },
      error: {
        ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
        variant: ToastVariants.Icon,
        iconName: IconName.CircleX,
        iconColor: theme.colors.error.default,
        hapticsType: NotificationFeedbackType.Error,
        startAccessory: (
          <View style={toastStyles.iconWrapper}>
            <Icon
              name={IconName.CircleX}
              color={theme.colors.error.default}
              size={IconSize.Xl}
            />
          </View>
        ),
      },
    }),
    [theme],
  );

  const showToast = useCallback(
    (config: EarnToastOptions) => {
      const { hapticsType, ...toastOptions } = config;
      toastRef?.current?.showToast(toastOptions as ToastOptions);
      notificationAsync(hapticsType);
    },
    [toastRef],
  );

  // Centralized toast options for Earn
  const EarnToastOptions: EarnToastOptionsConfig = useMemo(
    () => ({
      mUsdConversion: {
        inProgress: ({
          tokenSymbol,
          tokenIcon,
          estimatedTimeSeconds,
        }: MusdConversionInProgressParams) => ({
          ...(EARN_TOASTS_DEFAULT_OPTIONS as EarnToastOptions),
          variant: ToastVariants.Icon,
          iconName: IconName.Loading,
          iconColor: theme.colors.icon.default,
          backgroundColor: theme.colors.background.default,
          hapticsType: NotificationFeedbackType.Warning,
          hasNoTimeout: true,
          startAccessory: (
            <TokenIconWithSpinner
              tokenSymbol={tokenSymbol}
              tokenIcon={tokenIcon}
            />
          ),
          labelOptions: getEarnToastLabels({
            primary: strings('earn.musd_conversion.toasts.converting', {
              token: tokenSymbol,
            }),
          }),
          descriptionOptions: {
            description: formatEstimatedTime(estimatedTimeSeconds),
          },
          closeButtonOptions,
        }),
        success: {
          ...earnBaseToastOptions.success,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.musd_conversion.toasts.delivered'),
          }),
          closeButtonOptions,
        },
        failed: {
          ...earnBaseToastOptions.error,
          labelOptions: getEarnToastLabels({
            primary: strings('earn.musd_conversion.toasts.failed'),
          }),
          closeButtonOptions,
        },
      },
    }),
    [
      closeButtonOptions,
      earnBaseToastOptions.error,
      earnBaseToastOptions.success,
      theme.colors.background.default,
      theme.colors.icon.default,
    ],
  );

  return { showToast, EarnToastOptions };
};

export default useEarnToasts;
