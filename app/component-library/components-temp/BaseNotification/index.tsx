import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  StyleProp,
  TextLayoutEvent,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  IconName,
  IconSize,
  IconAlert,
  IconAlertSeverity,
  IconColor,
  Spinner,
  ButtonIcon,
  ButtonIconSize,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../locales/i18n';
import { useStyles } from '../../hooks';
import {
  NOTIFICATION_DISMISS_DISTANCE_THRESHOLD,
  NOTIFICATION_DISMISS_MIN_DISTANCE,
  NOTIFICATION_DISMISS_VELOCITY_THRESHOLD,
  NOTIFICATION_SPRING_CONFIG,
  NOTIFICATION_SWIPE_ACTIVE_OFFSET_Y,
  NOTIFICATION_SWIPE_FAIL_OFFSET_X,
  NOTIFICATION_TOP_PADDING,
  NOTIFICATION_VISIBILITY_DURATION,
} from './BaseNotification.constants';
import { BaseNotificationTestIds } from './BaseNotification.testIds';

import styleSheet from './BaseNotification.styles';
import {
  BaseNotificationData,
  BaseNotificationProps,
  BaseNotificationStatus,
} from './BaseNotification.types';

const screenHeight = Dimensions.get('window').height;

const getHiddenTranslateY = (height: number) => -height;

export const getIcon = (status: BaseNotificationStatus | undefined) => {
  switch (status) {
    case 'pending':
    case 'pending_withdrawal':
    case 'pending_deposit':
    case 'speedup':
      return (
        <Spinner
          color={IconColor.IconDefault}
          spinnerIconProps={{ size: IconSize.Lg }}
        />
      );
    case 'success_deposit':
    case 'success_withdrawal':
    case 'success':
    case 'received':
    case 'received_payment':
    case 'eth_received':
    case 'import_success':
    case 'simple_notification':
      return (
        <IconAlert severity={IconAlertSeverity.Success} size={IconSize.Lg} />
      );
    case 'cancelled':
    case 'error':
    case 'simple_notification_rejected':
      return (
        <IconAlert severity={IconAlertSeverity.Danger} size={IconSize.Lg} />
      );
    default:
      return null;
  }
};

const getTitle = (
  status: BaseNotificationStatus | undefined,
  { nonce, amount, assetType }: BaseNotificationData,
): string | undefined => {
  switch (status) {
    case 'pending':
      return strings('notifications.pending_title');
    case 'pending_deposit':
      return strings('notifications.pending_deposit_title');
    case 'pending_withdrawal':
      return strings('notifications.pending_withdrawal_title');
    case 'success': {
      const parsed =
        nonce != null ? Number.parseInt(String(nonce), 10) : Number.NaN;
      if (!Number.isNaN(parsed)) {
        return strings('notifications.success_title', { nonce: parsed });
      }
      return strings('notifications.success_title', { nonce: '' })
        .replace(' # ', ' ')
        .trim();
    }
    case 'success_deposit':
      return strings('notifications.success_deposit_title');
    case 'success_withdrawal':
      return strings('notifications.success_withdrawal_title');
    case 'received':
      return strings('notifications.received_title', { amount, assetType });
    case 'speedup': {
      const parsed =
        nonce != null ? Number.parseInt(String(nonce), 10) : Number.NaN;
      if (!Number.isNaN(parsed)) {
        return strings('notifications.speedup_title', { nonce: parsed });
      }
      return strings('notifications.speedup_title', { nonce: '' })
        .replace(' #', '')
        .trim();
    }
    case 'received_payment':
      return strings('notifications.received_payment_title');
    case 'cancelled':
      return strings('notifications.cancelled_title');
    case 'error':
      return strings('notifications.error_title');
    default:
      return undefined;
  }
};

export const getDescription = (
  status: BaseNotificationStatus | undefined,
  { amount = null, type = null }: BaseNotificationData,
): string => {
  if (amount && typeof amount !== 'object' && type) {
    return strings(`notifications.${type}_${status}_message`, { amount });
  }
  return strings(`notifications.${status}_message`);
};

/**
 * @deprecated Please update your code to use `Toast` from `@metamask/design-system-react-native`.
 *
 * The API may have changed — compare props before migrating.
 *
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react/src/components/Toast/Toast.tsx}
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/MIGRATION.md#toast-component Migration docs}
 */
const BaseNotification: React.FC<BaseNotificationProps> = ({
  status,
  data,
  onPress,
  onHide,
  autoDismiss = false,
  isVisible = true,
  onDismissComplete,
  dismissDuration,
  persistUntilDismiss = false,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const { top: topInset } = useSafeAreaInsets();
  const safeData: BaseNotificationData = data ?? {};
  const { description = null, title = null } = safeData;
  const [descriptionLineCount, setDescriptionLineCount] = useState<
    number | null
  >(null);
  const [titleLineCount, setTitleLineCount] = useState<number | null>(null);

  const notificationHeight = useSharedValue(screenHeight);
  const translateYProgress = useSharedValue(-screenHeight);
  const visibleTranslateY = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const hasEnteredRef = useRef(false);
  const dismissCompleteCalledRef = useRef(false);
  const visibleAtRef = useRef<number | null>(null);
  const persistUntilDismissRef = useRef(persistUntilDismiss);
  persistUntilDismissRef.current = persistUntilDismiss;
  const dismissDurationMs = dismissDuration ?? NOTIFICATION_VISIBILITY_DURATION;

  const hasCloseIconButton = autoDismiss;
  const resolvedDescription = !description
    ? getDescription(status, safeData)
    : description;
  const hasDescription = resolvedDescription.length > 0;
  const shouldTopAlign =
    (titleLineCount !== null && titleLineCount > 1 && hasDescription) ||
    (descriptionLineCount !== null && descriptionLineCount > 1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYProgress.value }],
  }));
  const baseStyle: StyleProp<ViewStyle> = useMemo(
    () => [
      styles.base,
      shouldTopAlign && styles.baseTopAligned,
      hasCloseIconButton && styles.baseWithCloseIconButton,
      animatedStyle,
    ],
    [
      styles.base,
      styles.baseTopAligned,
      styles.baseWithCloseIconButton,
      animatedStyle,
      hasCloseIconButton,
      shouldTopAlign,
    ],
  );

  useEffect(() => {
    setDescriptionLineCount(null);
    setTitleLineCount(null);
    hasEnteredRef.current = false;
    dismissCompleteCalledRef.current = false;
    visibleAtRef.current = null;
  }, [status, title, description, isVisible]);

  const handleTitleTextLayout = (event: TextLayoutEvent) => {
    const lineCount = event.nativeEvent.lines.length;

    setTitleLineCount((current) =>
      current === lineCount ? current : lineCount,
    );
  };

  const handleDescriptionTextLayout = (event: TextLayoutEvent) => {
    const lineCount = event.nativeEvent.lines.length;

    setDescriptionLineCount((current) =>
      current === lineCount ? current : lineCount,
    );
  };

  const runExitAnimation = useCallback(
    (onComplete?: () => void) => {
      const hiddenTranslateY = getHiddenTranslateY(notificationHeight.value);

      translateYProgress.value = withSpring(
        hiddenTranslateY,
        NOTIFICATION_SPRING_CONFIG,
        () => {
          if (onComplete) {
            runOnJS(onComplete)();
          }
        },
      );
    },
    [notificationHeight, translateYProgress],
  );

  const handleDismissComplete = useCallback(() => {
    if (dismissCompleteCalledRef.current) {
      return;
    }

    dismissCompleteCalledRef.current = true;
    visibleAtRef.current = null;
    onDismissComplete?.();
  }, [onDismissComplete]);

  const scheduleAutoDismiss = useCallback(
    (delayMs: number) => {
      const hiddenTranslateY = getHiddenTranslateY(notificationHeight.value);

      translateYProgress.value = withDelay(
        delayMs,
        withSpring(hiddenTranslateY, NOTIFICATION_SPRING_CONFIG, () => {
          runOnJS(handleDismissComplete)();
        }),
      );
    },
    [handleDismissComplete, notificationHeight, translateYProgress],
  );

  const beginAutoDismiss = useCallback(() => {
    visibleAtRef.current = Date.now();
    scheduleAutoDismiss(dismissDurationMs);
  }, [dismissDurationMs, scheduleAutoDismiss]);

  const resumeAutoDismissAfterSwipe = useCallback(() => {
    if (persistUntilDismissRef.current) {
      return;
    }

    if (visibleAtRef.current === null) {
      visibleAtRef.current = Date.now();
      scheduleAutoDismiss(dismissDurationMs);
      return;
    }

    const elapsed = Date.now() - visibleAtRef.current;
    if (elapsed >= dismissDurationMs) {
      runExitAnimation(() => {
        handleDismissComplete();
      });
      return;
    }

    scheduleAutoDismiss(dismissDurationMs - elapsed);
  }, [
    dismissDurationMs,
    handleDismissComplete,
    runExitAnimation,
    scheduleAutoDismiss,
  ]);

  useEffect(
    () => () => {
      if (hasEnteredRef.current && !dismissCompleteCalledRef.current) {
        dismissCompleteCalledRef.current = true;
        onDismissComplete?.();
      }
    },
    [onDismissComplete],
  );

  const handleManualDismiss = useCallback(() => {
    visibleAtRef.current = null;
    cancelAnimation(translateYProgress);
    runExitAnimation(() => {
      onHide?.();
      handleDismissComplete();
    });
  }, [handleDismissComplete, onHide, runExitAnimation, translateYProgress]);

  const handleManualDismissRef = useRef(handleManualDismiss);
  const resumeAutoDismissAfterSwipeRef = useRef(resumeAutoDismissAfterSwipe);
  handleManualDismissRef.current = handleManualDismiss;
  resumeAutoDismissAfterSwipeRef.current = resumeAutoDismissAfterSwipe;

  const dismissNotificationFromSwipe = () => {
    handleManualDismissRef.current();
  };

  const resumeAutoDismissFromSwipe = () => {
    resumeAutoDismissAfterSwipeRef.current();
  };

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(NOTIFICATION_SWIPE_ACTIVE_OFFSET_Y)
        .failOffsetX([
          -NOTIFICATION_SWIPE_FAIL_OFFSET_X,
          NOTIFICATION_SWIPE_FAIL_OFFSET_X,
        ])
        .onStart(() => {
          cancelAnimation(translateYProgress);
          gestureStartY.value = translateYProgress.value;
        })
        .onUpdate((event) => {
          const nextTranslateY = gestureStartY.value + event.translationY;
          // Notification sits at the top; only allow dragging upward (more negative).
          translateYProgress.value = Math.min(
            nextTranslateY,
            visibleTranslateY.value,
          );
        })
        .onEnd((event) => {
          const { translationY, velocityY } = event;
          const dismissDistance = Math.max(
            notificationHeight.value * NOTIFICATION_DISMISS_DISTANCE_THRESHOLD,
            NOTIFICATION_DISMISS_MIN_DISTANCE,
          );
          const hasReachedDismissOffset = translationY <= -dismissDistance;
          const hasReachedSwipeThreshold =
            Math.abs(velocityY) > NOTIFICATION_DISMISS_VELOCITY_THRESHOLD;
          const isQuickDismissing = velocityY < 0;

          const shouldDismiss =
            hasReachedDismissOffset ||
            (hasReachedSwipeThreshold && isQuickDismissing);

          if (shouldDismiss) {
            runOnJS(dismissNotificationFromSwipe)();
            return;
          }

          translateYProgress.value = withSpring(
            visibleTranslateY.value,
            NOTIFICATION_SPRING_CONFIG,
            () => {
              runOnJS(resumeAutoDismissFromSwipe)();
            },
          );
        }),
    // Shared values and swipe JS wrappers are stable for the component lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onAnimatedViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!isVisible || hasEnteredRef.current) {
        return;
      }

      hasEnteredRef.current = true;
      const { height } = event.nativeEvent.layout;
      const hiddenTranslateY = getHiddenTranslateY(height);
      const nextVisibleTranslateY = topInset + NOTIFICATION_TOP_PADDING;

      notificationHeight.value = height;
      visibleTranslateY.value = nextVisibleTranslateY;
      visibleAtRef.current = null;
      translateYProgress.value = hiddenTranslateY;

      if (persistUntilDismiss) {
        translateYProgress.value = withSpring(
          nextVisibleTranslateY,
          NOTIFICATION_SPRING_CONFIG,
        );
        return;
      }

      translateYProgress.value = withSpring(
        nextVisibleTranslateY,
        NOTIFICATION_SPRING_CONFIG,
        () => {
          runOnJS(beginAutoDismiss)();
        },
      );
    },
    [
      beginAutoDismiss,
      isVisible,
      notificationHeight,
      persistUntilDismiss,
      topInset,
      translateYProgress,
      visibleTranslateY,
    ],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View
        onLayout={onAnimatedViewLayout}
        style={baseStyle}
        testID="base-notification-container"
      >
        <TouchableOpacity
          style={[
            styles.pressableContent,
            shouldTopAlign && styles.pressableContentTopAligned,
          ]}
          onPress={onPress}
          activeOpacity={0.8}
          disabled={!onPress}
        >
          <View>{getIcon(status)}</View>
          <View
            style={[
              styles.flashLabel,
              shouldTopAlign && styles.flashLabelTopAligned,
            ]}
            testID={BaseNotificationTestIds.CONTAINER}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              style={styles.flashTitle}
              testID={BaseNotificationTestIds.NOTIFICATION_TITLE}
              onTextLayout={handleTitleTextLayout}
            >
              {!title ? getTitle(status, safeData) : title}
            </Text>
            {hasDescription ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                style={styles.flashText}
                onTextLayout={handleDescriptionTextLayout}
              >
                {resolvedDescription}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
        {autoDismiss && (
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleManualDismiss}
            style={shouldTopAlign ? styles.closeButton : undefined}
            testID="base-notification-close"
          />
        )}
      </Animated.View>
    </GestureDetector>
  );
};

export default BaseNotification;
