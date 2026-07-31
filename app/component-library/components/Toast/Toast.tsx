/* eslint-disable react/prop-types */

// Third party dependencies.
import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleProp,
  TextLayoutEventData,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariant } from '../Avatars/Avatar';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName as DsIconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

// Internal dependencies.
import {
  ButtonIconVariant,
  ToastCloseButtonOptions,
  ToastDescriptionOptions,
  ToastLabelOptions,
  ToastLinkButtonOptions,
  ToastOptions,
  ToastRef,
  ToastVariants,
} from './Toast.types';
import styleSheet from './Toast.styles';
import { ToastSelectorsIDs } from './ToastModal.testIds';
import {
  TOAST_DISMISS_DISTANCE_THRESHOLD,
  TOAST_DISMISS_VELOCITY_THRESHOLD,
  TOAST_SPRING_CONFIG,
  TOAST_SWIPE_ACTIVE_OFFSET_Y,
  TOAST_SWIPE_FAIL_OFFSET_X,
  visibilityDuration,
} from './Toast.constants';
import { useStyles } from '../../hooks';
import { ButtonProps, ButtonVariants } from '../Buttons/Button/Button.types';
import ButtonIcon from '../Buttons/ButtonIcon';
import { ButtonIconSizes } from '../Buttons/ButtonIcon/ButtonIcon.types';

const screenHeight = Dimensions.get('window').height;

const getHiddenTranslateY = (height: number, offset: number) =>
  -(height + offset);

const hasToastDescription = (options: ToastOptions | undefined): boolean => {
  if (!options) {
    return false;
  }

  if (options.descriptionOptions?.description) {
    return true;
  }

  const descriptionSplitIndex = options.labelOptions.findIndex(
    (option, index) => index > 0 && option.label === '\n',
  );

  return (
    descriptionSplitIndex !== -1 &&
    options.labelOptions.slice(descriptionSplitIndex + 1).length > 0
  );
};

const shouldTopAlignToastContent = ({
  titleLineCount,
  hasDescription,
  descriptionLineCount,
  hasActionButton,
  hasTrailingTextButton,
}: {
  titleLineCount: number | null;
  hasDescription: boolean;
  descriptionLineCount: number | null;
  hasActionButton: boolean;
  hasTrailingTextButton: boolean;
}): boolean => {
  if (hasTrailingTextButton) {
    return false;
  }

  if (titleLineCount !== null && titleLineCount > 1 && hasDescription) {
    return true;
  }

  if (!hasDescription) {
    return false;
  }

  if (descriptionLineCount === null) {
    return hasActionButton;
  }

  if (descriptionLineCount > 1) {
    return true;
  }

  return descriptionLineCount === 1 && hasActionButton;
};

const hasTrailingTextButton = (
  closeButtonOptions: ToastCloseButtonOptions | undefined,
): boolean =>
  closeButtonOptions != null &&
  closeButtonOptions.variant !== ButtonIconVariant.Icon;

const mapLegacyButtonVariant = (variant?: ButtonVariants): ButtonVariant => {
  if (variant === ButtonVariants.Secondary) {
    return ButtonVariant.Secondary;
  }
  if (variant === ButtonVariants.Link) {
    return ButtonVariant.Secondary;
  }
  return ButtonVariant.Primary;
};

// Lazy map so incomplete Jest mocks of design-system-react-native do not
// crash Toast barrel imports (e.g. ToastContext-only consumers).
const getLegacyIconColorToDs = (): Record<string, IconColor> => ({
  Default: IconColor.IconDefault,
  Inverse: IconColor.OverlayInverse,
  Alternative: IconColor.IconAlternative,
  Muted: IconColor.IconMuted,
  Primary: IconColor.PrimaryDefault,
  PrimaryAlternative: IconColor.PrimaryAlternative,
  Success: IconColor.SuccessDefault,
  Error: IconColor.ErrorDefault,
  ErrorAlternative: IconColor.ErrorAlternative,
  Warning: IconColor.WarningDefault,
  Info: IconColor.InfoDefault,
});

const resolveToastIconAppearance = (
  iconColor?: string,
): { color?: IconColor; style?: StyleProp<ViewStyle> } => {
  if (!iconColor) {
    return {};
  }

  if (!IconColor) {
    return { style: { color: iconColor } as ViewStyle };
  }

  const dsIconColors = Object.values(IconColor) as string[];
  if (dsIconColors.includes(iconColor)) {
    return { color: iconColor as IconColor };
  }

  const legacyIconColorToDs = getLegacyIconColorToDs();
  if (iconColor in legacyIconColorToDs) {
    return { color: legacyIconColorToDs[iconColor] };
  }

  // Call sites may pass raw theme colors (e.g. theme.colors.success.default).
  // Icon uses fill="currentColor"; RN SVG reads `color` from style at runtime
  // even though ViewStyle does not declare it.
  return { style: { color: iconColor } as ViewStyle };
};

/**
 * @deprecated Please update your code to use `Toast` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Toast/README.md}
 * @since @metamask/design-system-react-native@0.7.0
 */
const Toast = forwardRef((_, ref: React.ForwardedRef<ToastRef>) => {
  const { styles } = useStyles(styleSheet, {});
  const [toastOptions, setToastOptions] = useState<ToastOptions | undefined>(
    undefined,
  );
  const [descriptionLineCount, setDescriptionLineCount] = useState<
    number | null
  >(null);
  const [titleLineCount, setTitleLineCount] = useState<number | null>(null);
  const { top: topInset } = useSafeAreaInsets();
  const hiddenTranslateY = useSharedValue(-screenHeight);
  const translateYProgress = useSharedValue(-screenHeight);
  const visibleTranslateY = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const toastHeight = useSharedValue(0);
  const pendingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoDismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const animationStartedRef = useRef(false);
  const visibleAtRef = useRef<number | null>(null);
  const hasNoTimeoutRef = useRef(false);
  const isDismissing = useSharedValue(false);
  const topOffset = toastOptions?.customTopOffset ?? 0;
  hasNoTimeoutRef.current = Boolean(toastOptions?.hasNoTimeout);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYProgress.value + topOffset }],
  }));
  const hasCloseIconButton =
    toastOptions?.closeButtonOptions?.variant === ButtonIconVariant.Icon;
  const hasDescription = hasToastDescription(toastOptions);
  const hasActionButton = Boolean(toastOptions?.linkButtonOptions);
  const hasTrailingTextButtonOption = hasTrailingTextButton(
    toastOptions?.closeButtonOptions,
  );
  const shouldTopAlign = shouldTopAlignToastContent({
    titleLineCount,
    hasDescription,
    descriptionLineCount,
    hasActionButton,
    hasTrailingTextButton: hasTrailingTextButtonOption,
  });
  const baseStyle: StyleProp<ViewStyle> = useMemo(
    () => [
      styles.base,
      !hasDescription && styles.baseWithoutDescription,
      shouldTopAlign && styles.baseTopAligned,
      toastOptions?.linkButtonOptions && styles.baseWithActionButton,
      hasCloseIconButton && styles.baseWithCloseIconButton,
      animatedStyle,
    ],
    [
      styles.base,
      styles.baseWithoutDescription,
      styles.baseTopAligned,
      styles.baseWithActionButton,
      styles.baseWithCloseIconButton,
      animatedStyle,
      hasDescription,
      shouldTopAlign,
      toastOptions?.linkButtonOptions,
      hasCloseIconButton,
    ],
  );

  const clearScheduledAutoDismiss = () => {
    if (autoDismissTimeoutRef.current !== null) {
      clearTimeout(autoDismissTimeoutRef.current);
      autoDismissTimeoutRef.current = null;
    }
  };

  const resetState = () => {
    animationStartedRef.current = false;
    visibleAtRef.current = null;
    isDismissing.value = false;
    clearScheduledAutoDismiss();
    setDescriptionLineCount(null);
    setTitleLineCount(null);
    setToastOptions(undefined);
  };

  const startDismissAnimation = () => {
    clearScheduledAutoDismiss();
    isDismissing.value = true;
    visibleAtRef.current = null;
    translateYProgress.value = withSpring(
      hiddenTranslateY.value,
      TOAST_SPRING_CONFIG,
      (finished) => {
        if (finished) {
          runOnJS(resetState)();
        }
      },
    );
  };

  const scheduleAutoDismiss = (delayMs: number) => {
    clearScheduledAutoDismiss();
    autoDismissTimeoutRef.current = setTimeout(() => {
      autoDismissTimeoutRef.current = null;
      startDismissAnimation();
    }, delayMs);
  };

  const beginAutoDismiss = () => {
    visibleAtRef.current = Date.now();
    scheduleAutoDismiss(visibilityDuration);
  };

  const ensureAutoDismissAfterIncompleteSwipe = () => {
    if (hasNoTimeoutRef.current || isDismissing.value) {
      return;
    }

    // Entrance was interrupted before auto-dismiss started — start a full timer
    // now (from onEnd) rather than from spring-back completion. showToast clears
    // visibleAtRef on replace; a queued spring-back resume must not treat that
    // as an interrupted entrance and schedule dismiss on the new toast.
    if (visibleAtRef.current === null && animationStartedRef.current) {
      beginAutoDismiss();
    }
  };

  const resumeAutoDismissAfterSwipe = () => {
    if (hasNoTimeoutRef.current || isDismissing.value) {
      return;
    }

    // null means the toast was replaced/reset, or ensure already could not start
    // a timer (e.g. mid-replace). Do not begin a new auto-dismiss here.
    if (visibleAtRef.current === null) {
      return;
    }

    const elapsed = Date.now() - visibleAtRef.current;
    if (elapsed >= visibilityDuration) {
      startDismissAnimation();
      return;
    }

    scheduleAutoDismiss(visibilityDuration - elapsed);
  };

  const syncDismissTargetAfterRemeasure = () => {
    if (
      toastOptions?.hasNoTimeout ||
      visibleAtRef.current === null ||
      isDismissing.value
    ) {
      return;
    }

    const elapsed = Date.now() - visibleAtRef.current;
    clearScheduledAutoDismiss();
    cancelAnimation(translateYProgress);

    if (elapsed >= visibilityDuration) {
      startDismissAnimation();
      return;
    }

    scheduleAutoDismiss(visibilityDuration - elapsed);
  };

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

  const showToast = (options: ToastOptions) => {
    if (pendingTimeoutRef.current !== null) {
      clearTimeout(pendingTimeoutRef.current);
      pendingTimeoutRef.current = null;
    }

    let timeoutDuration = 0;
    if (toastOptions) {
      // Always clear any pending auto-dismiss from the previous toast, including
      // when the replacement is persistent (hasNoTimeout). Otherwise the old
      // timer can fire and dismiss the new toast.
      clearScheduledAutoDismiss();
      cancelAnimation(translateYProgress);
      timeoutDuration = 100;
      // Clear existing toast state to prevent animation conflicts when showing rapid successive toasts
      animationStartedRef.current = false;
      visibleAtRef.current = null;
      isDismissing.value = false;
      setDescriptionLineCount(null);
      setTitleLineCount(null);
      setToastOptions(undefined);
    }
    pendingTimeoutRef.current = setTimeout(() => {
      pendingTimeoutRef.current = null;
      setToastOptions(options);
    }, timeoutDuration);
  };

  const closeToast = () => {
    startDismissAnimation();
  };

  const closeToastRef = useRef(closeToast);
  const ensureAutoDismissAfterIncompleteSwipeRef = useRef(
    ensureAutoDismissAfterIncompleteSwipe,
  );
  const resumeAutoDismissAfterSwipeRef = useRef(resumeAutoDismissAfterSwipe);
  const clearScheduledAutoDismissRef = useRef(clearScheduledAutoDismiss);
  closeToastRef.current = closeToast;
  ensureAutoDismissAfterIncompleteSwipeRef.current =
    ensureAutoDismissAfterIncompleteSwipe;
  resumeAutoDismissAfterSwipeRef.current = resumeAutoDismissAfterSwipe;
  clearScheduledAutoDismissRef.current = clearScheduledAutoDismiss;

  const dismissToastFromSwipe = () => {
    closeToastRef.current();
  };

  const ensureAutoDismissFromSwipe = () => {
    ensureAutoDismissAfterIncompleteSwipeRef.current();
  };

  const resumeAutoDismissFromSwipe = () => {
    resumeAutoDismissAfterSwipeRef.current();
  };

  const clearScheduledAutoDismissFromSwipe = () => {
    clearScheduledAutoDismissRef.current();
  };

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(TOAST_SWIPE_ACTIVE_OFFSET_Y)
        .failOffsetX([-TOAST_SWIPE_FAIL_OFFSET_X, TOAST_SWIPE_FAIL_OFFSET_X])
        .onStart(() => {
          // Don't interrupt an in-progress dismiss animation.
          if (isDismissing.value) {
            return;
          }
          runOnJS(clearScheduledAutoDismissFromSwipe)();
          cancelAnimation(translateYProgress);
          gestureStartY.value = translateYProgress.value;
        })
        .onUpdate((event) => {
          if (isDismissing.value) {
            return;
          }
          const nextTranslateY = gestureStartY.value + event.translationY;
          // Toast sits at the top; only allow dragging upward (more negative).
          translateYProgress.value = Math.min(
            nextTranslateY,
            visibleTranslateY.value,
          );
        })
        .onEnd((event) => {
          if (isDismissing.value) {
            return;
          }
          const { translationY, velocityY } = event;
          const dismissDistance = Math.max(
            toastHeight.value * TOAST_DISMISS_DISTANCE_THRESHOLD,
            24,
          );
          const hasReachedDismissOffset = translationY <= -dismissDistance;
          const hasReachedSwipeThreshold =
            Math.abs(velocityY) > TOAST_DISMISS_VELOCITY_THRESHOLD;
          const isQuickDismissing = velocityY < 0;

          const shouldDismiss =
            hasReachedDismissOffset ||
            (hasReachedSwipeThreshold && isQuickDismissing);

          if (shouldDismiss) {
            runOnJS(dismissToastFromSwipe)();
            return;
          }

          // Start (or keep) auto-dismiss before spring-back so a later toast
          // replace cannot be dismissed by a stale spring completion.
          runOnJS(ensureAutoDismissFromSwipe)();

          translateYProgress.value = withSpring(
            visibleTranslateY.value,
            TOAST_SPRING_CONFIG,
            (finished) => {
              // A new pan cancels this spring via cancelAnimation; only resume
              // auto-dismiss when the spring-back completed naturally.
              if (finished) {
                runOnJS(resumeAutoDismissFromSwipe)();
              }
            },
          );
        }),
    // Shared values and swipe JS wrappers are stable for the component lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useImperativeHandle(ref, () => ({
    showToast,
    closeToast,
  }));

  // Toast height can change after the first render when text layout updates
  // top-alignment styles. We avoid restarting the entrance animation and update
  // the dismiss position after the final size is measured to keep animation and
  // auto-dismiss timing consistent.
  const onAnimatedViewLayout = (e: LayoutChangeEvent) => {
    if (toastOptions) {
      const { height } = e.nativeEvent.layout;
      const nextHiddenTranslateY = getHiddenTranslateY(height, topOffset);
      const nextVisibleTranslateY = topInset + 8;

      hiddenTranslateY.value = nextHiddenTranslateY;
      visibleTranslateY.value = nextVisibleTranslateY;
      toastHeight.value = height;

      if (animationStartedRef.current) {
        syncDismissTargetAfterRemeasure();
        return;
      }

      animationStartedRef.current = true;
      visibleAtRef.current = null;
      translateYProgress.value = nextHiddenTranslateY;

      if (toastOptions.hasNoTimeout) {
        translateYProgress.value = withSpring(
          nextVisibleTranslateY,
          TOAST_SPRING_CONFIG,
        );
      } else {
        translateYProgress.value = withSpring(
          nextVisibleTranslateY,
          TOAST_SPRING_CONFIG,
          (finished) => {
            if (finished) {
              runOnJS(beginAutoDismiss)();
            }
          },
        );
      }
    }
  };

  const renderInlineLabelSegments = (segments: ToastLabelOptions) => (
    <Text variant={TextVariant.BodyMd} onTextLayout={handleTitleTextLayout}>
      {segments.map(({ label, isBold }) => {
        const weightKey = isBold === false ? 'normal' : 'bold';
        const segmentKey =
          typeof label === 'string'
            ? `${label}-${weightKey}`
            : `toast-label-${weightKey}`;

        return (
          <Text
            key={segmentKey}
            variant={isBold === false ? TextVariant.BodySm : TextVariant.BodyMd}
            fontWeight={isBold === false ? undefined : FontWeight.Medium}
            color={isBold === false ? TextColor.TextAlternative : undefined}
          >
            {label}
          </Text>
        );
      })}
    </Text>
  );

  const renderLabel = (labelOptions: ToastLabelOptions) => {
    const descriptionSplitIndex = labelOptions.findIndex(
      (option, index) => index > 0 && option.label === '\n',
    );

    if (descriptionSplitIndex === -1) {
      return renderInlineLabelSegments(labelOptions);
    }

    const titleOptions = labelOptions.slice(0, descriptionSplitIndex);
    const descriptionLabelOptions = labelOptions.slice(
      descriptionSplitIndex + 1,
    );

    return (
      <>
        {titleOptions.length > 0
          ? renderInlineLabelSegments(titleOptions)
          : null}
        {descriptionLabelOptions.length > 0 ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            style={styles.description}
            onTextLayout={handleDescriptionTextLayout}
          >
            {/* Prefer label content over array index so keys stay stable (Sonar S6479). */}
            {descriptionLabelOptions.map(({ label }) => (
              <Text
                key={typeof label === 'string' ? label : 'toast-description'}
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {label}
              </Text>
            ))}
          </Text>
        ) : null}
      </>
    );
  };

  const renderDescription = (descriptionOptions?: ToastDescriptionOptions) =>
    descriptionOptions && (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        style={styles.description}
        onTextLayout={handleDescriptionTextLayout}
      >
        {descriptionOptions.description}
      </Text>
    );

  const renderActionButton = (linkButtonOptions?: ToastLinkButtonOptions) =>
    linkButtonOptions && (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Sm}
        onPress={linkButtonOptions.onPress}
        style={styles.actionButton}
      >
        {linkButtonOptions.label}
      </Button>
    );

  const renderCloseButton = (closeButtonOptions?: ToastCloseButtonOptions) => {
    if (closeButtonOptions?.variant === ButtonIconVariant.Icon) {
      return (
        <ButtonIcon
          onPress={() => closeButtonOptions?.onPress?.()}
          iconName={closeButtonOptions?.iconName}
          size={ButtonIconSizes.Md}
          style={shouldTopAlign ? styles.closeButton : undefined}
        />
      );
    }
    const legacyCloseButton = closeButtonOptions as ButtonProps;

    return (
      <Button
        variant={mapLegacyButtonVariant(legacyCloseButton.variant)}
        size={ButtonSize.Sm}
        onPress={() => legacyCloseButton.onPress?.()}
        endIconName={legacyCloseButton.endIconName as DsIconName | undefined}
        style={[styles.trailingActionButton, legacyCloseButton.style]}
      >
        {legacyCloseButton.label}
      </Button>
    );
  };

  const renderAvatar = () => {
    switch (toastOptions?.variant) {
      case ToastVariants.Plain:
        return null;
      case ToastVariants.Account: {
        const { accountAddress } = toastOptions;
        const { accountAvatarType } = toastOptions;
        return (
          <Avatar
            variant={AvatarVariant.Account}
            accountAddress={accountAddress}
            // TODO PS: respect avatar global configs
            // should receive avatar type as props
            type={accountAvatarType}
            size={AvatarSize.Md}
          />
        );
      }
      case ToastVariants.Network: {
        const { networkImageSource, networkName } = toastOptions;
        return (
          <Avatar
            variant={AvatarVariant.Network}
            name={networkName}
            imageSource={networkImageSource}
            size={AvatarSize.Sm}
          />
        );
      }
      case ToastVariants.App: {
        const { appIconSource } = toastOptions;
        return (
          <Avatar
            variant={AvatarVariant.Favicon}
            imageSource={appIconSource}
            size={AvatarSize.Md}
          />
        );
      }
      case ToastVariants.Icon: {
        const { iconName, iconColor, backgroundColor } = toastOptions;
        const iconAppearance = resolveToastIconAppearance(iconColor);
        const icon = (
          <Icon
            name={iconName as DsIconName}
            size={IconSize.Lg}
            color={iconAppearance.color}
            style={iconAppearance.style}
          />
        );
        const hasIconBackground =
          backgroundColor != null && backgroundColor !== 'transparent';

        if (hasIconBackground) {
          return (
            <View style={[styles.iconBackground, { backgroundColor }]}>
              {icon}
            </View>
          );
        }

        return icon;
      }
    }
  };

  const renderToastContent = (options: ToastOptions) => {
    const {
      labelOptions,
      descriptionOptions,
      linkButtonOptions,
      closeButtonOptions,
      startAccessory,
    } = options;

    const isStartAccessoryValid =
      startAccessory != null && React.isValidElement(startAccessory);
    const leadingAccessory = isStartAccessoryValid
      ? startAccessory
      : renderAvatar();

    return (
      <>
        {leadingAccessory ? <View>{leadingAccessory}</View> : null}
        <View
          style={[
            styles.labelsContainer,
            shouldTopAlign && styles.labelsContainerTopAligned,
          ]}
          testID={ToastSelectorsIDs.CONTAINER}
        >
          {renderLabel(labelOptions)}
          {renderDescription(descriptionOptions)}
          {renderActionButton(linkButtonOptions)}
        </View>
        {closeButtonOptions ? renderCloseButton(closeButtonOptions) : null}
      </>
    );
  };

  if (!toastOptions) {
    return null;
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View onLayout={onAnimatedViewLayout} style={baseStyle}>
        {toastOptions.onPress ? (
          <Pressable
            style={[
              styles.pressableContent,
              shouldTopAlign && styles.pressableContentTopAligned,
            ]}
            onPress={toastOptions.onPress}
            testID={ToastSelectorsIDs.PRESSABLE}
          >
            {renderToastContent(toastOptions)}
          </Pressable>
        ) : (
          renderToastContent(toastOptions)
        )}
      </Animated.View>
    </GestureDetector>
  );
});

export { shouldTopAlignToastContent, hasTrailingTextButton };
export default Toast;
