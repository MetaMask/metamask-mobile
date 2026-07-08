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
  NativeSyntheticEvent,
  StyleProp,
  TextLayoutEventData,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
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
  NOTIFICATION_SPRING_CONFIG,
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
      const parsed = nonce != null ? parseInt(String(nonce), 10) : NaN;
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
      const parsed = nonce != null ? parseInt(String(nonce), 10) : NaN;
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
  const hasEnteredRef = useRef(false);
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
  }, [status, title, description, isVisible]);

  const handleTitleTextLayout = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
    const lineCount = event.nativeEvent.lines.length;

    setTitleLineCount((current) =>
      current === lineCount ? current : lineCount,
    );
  };

  const handleDescriptionTextLayout = (
    event: NativeSyntheticEvent<TextLayoutEventData>,
  ) => {
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
    onDismissComplete?.();
  }, [onDismissComplete]);

  const handleManualDismiss = useCallback(() => {
    cancelAnimation(translateYProgress);
    runExitAnimation(() => {
      onHide?.();
      handleDismissComplete();
    });
  }, [handleDismissComplete, onHide, runExitAnimation, translateYProgress]);

  const onAnimatedViewLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!isVisible || hasEnteredRef.current) {
        return;
      }

      hasEnteredRef.current = true;
      const { height } = event.nativeEvent.layout;
      const hiddenTranslateY = getHiddenTranslateY(height);
      const visibleTranslateY = topInset + NOTIFICATION_TOP_PADDING;

      notificationHeight.value = height;
      translateYProgress.value = hiddenTranslateY;

      if (persistUntilDismiss) {
        translateYProgress.value = withSpring(
          visibleTranslateY,
          NOTIFICATION_SPRING_CONFIG,
        );
        return;
      }

      translateYProgress.value = withSpring(
        visibleTranslateY,
        NOTIFICATION_SPRING_CONFIG,
        () => {
          translateYProgress.value = withDelay(
            dismissDurationMs,
            withSpring(hiddenTranslateY, NOTIFICATION_SPRING_CONFIG, () => {
              runOnJS(handleDismissComplete)();
            }),
          );
        },
      );
    },
    [
      dismissDurationMs,
      handleDismissComplete,
      isVisible,
      notificationHeight,
      persistUntilDismiss,
      topInset,
      translateYProgress,
    ],
  );

  if (!isVisible) {
    return null;
  }

  return (
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
  );
};

export default BaseNotification;
