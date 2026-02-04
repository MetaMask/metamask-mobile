/* eslint-disable react/prop-types */

// Third party dependencies.
import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  IconColor as ReactNativeDsIconColor,
  IconSize as ReactNativeDsIconSize,
} from '@metamask/design-system-react-native';
import { Spinner } from '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariant } from '../Avatars/Avatar';
import Text, { TextColor, TextVariant } from '../Texts/Text';
import Button, { ButtonVariants } from '../Buttons/Button';
import Icon, { IconName, IconSize } from '../Icons/Icon';
import { useAppThemeFromContext } from '../../../util/theme';

// Internal dependencies.
import {
  ButtonIconVariant,
  PredictToastType,
  ToastCloseButtonOptions,
  ToastDescriptionOptions,
  ToastLabelOptions,
  ToastLinkButtonOptions,
  ToastOptions,
  ToastRef,
  ToastVariants,
} from './Toast.types';
import { ButtonProps } from '../Buttons/Button/Button.types';
import styleSheet from './Toast.styles';
import { ToastSelectorsIDs } from './ToastModal.testIds';
import { TAB_BAR_HEIGHT } from '../Navigation/TabBar/TabBar.constants';
import { useStyles } from '../../hooks';
import ButtonIcon from '../Buttons/ButtonIcon';

const visibilityDuration = 2750;
const animationDuration = 250;
const bottomPadding = 36;
const screenHeight = Dimensions.get('window').height;

const Toast = forwardRef((_, ref: React.ForwardedRef<ToastRef>) => {
  const { styles } = useStyles(styleSheet, {});
  const theme = useAppThemeFromContext();
  const [toastOptions, setToastOptions] = useState<ToastOptions | undefined>(
    undefined,
  );
  const { bottom: bottomNotchSpacing } = useSafeAreaInsets();
  const translateYProgress = useSharedValue(screenHeight);
  const customOffset = toastOptions?.customBottomOffset ?? 0;
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateYProgress.value - TAB_BAR_HEIGHT - customOffset },
    ],
  }));
  const baseStyle: StyleProp<ViewStyle> = useMemo(
    () => [styles.base, animatedStyle],
    [styles.base, animatedStyle],
  );

  const resetState = () => setToastOptions(undefined);

  const showToast = (options: ToastOptions) => {
    let timeoutDuration = 0;
    if (toastOptions) {
      if (!options.hasNoTimeout) {
        cancelAnimation(translateYProgress);
      }
      timeoutDuration = 100;
      // Clear existing toast state to prevent animation conflicts when showing rapid successive toasts
      setToastOptions(undefined);
    }
    setTimeout(() => {
      setToastOptions(options);
    }, timeoutDuration);
  };

  const closeToast = () => {
    translateYProgress.value = withTiming(
      screenHeight,
      { duration: animationDuration },
      () => {
        runOnJS(resetState)();
      },
    );
  };

  useImperativeHandle(ref, () => ({
    showToast,
    closeToast,
  }));

  const onAnimatedViewLayout = (e: LayoutChangeEvent) => {
    if (toastOptions) {
      const { height } = e.nativeEvent.layout;
      const translateYToValue = -(bottomPadding + bottomNotchSpacing);

      translateYProgress.value = height;

      if (toastOptions.hasNoTimeout) {
        translateYProgress.value = withTiming(translateYToValue, {
          duration: animationDuration,
        });
      } else {
        translateYProgress.value = withTiming(
          translateYToValue,
          { duration: animationDuration },
          () => {
            translateYProgress.value = withDelay(
              visibilityDuration,
              withTiming(
                height,
                { duration: animationDuration },
                runOnJS(resetState),
              ),
            );
          },
        );
      }
    }
  };

  const renderLabel = (labelOptions: ToastLabelOptions) => (
    <Text variant={TextVariant.BodyMD}>
      {labelOptions.map(({ label, isBold }, index) => (
        <Text
          key={`toast-label-${index}`}
          variant={isBold ? TextVariant.BodyMDBold : TextVariant.BodyMD}
          style={styles.label}
        >
          {label}
        </Text>
      ))}
    </Text>
  );

  const renderDescription = (descriptionOptions?: ToastDescriptionOptions) =>
    descriptionOptions && (
      <Text
        variant={TextVariant.BodySM}
        color={TextColor.Alternative}
        style={styles.description}
      >
        {descriptionOptions.description}
      </Text>
    );

  const renderActionButton = (linkButtonOptions?: ToastLinkButtonOptions) =>
    linkButtonOptions && (
      <Button
        variant={ButtonVariants.Secondary}
        onPress={linkButtonOptions.onPress}
        labelTextVariant={TextVariant.BodyMD}
        label={linkButtonOptions.label}
        style={styles.actionButton}
      />
    );

  const renderCloseButton = (closeButtonOptions?: ToastCloseButtonOptions) => {
    if (closeButtonOptions?.variant === ButtonIconVariant.Icon) {
      return (
        <ButtonIcon
          onPress={() => closeButtonOptions?.onPress?.()}
          iconName={closeButtonOptions?.iconName}
        />
      );
    }
    const buttonProps = closeButtonOptions as ButtonProps | undefined;
    return (
      <Button
        variant={buttonProps?.variant ?? ButtonVariants.Primary}
        onPress={() => closeButtonOptions?.onPress()}
        label={buttonProps?.label}
        endIconName={buttonProps?.endIconName}
        style={buttonProps?.style}
      />
    );
  };

  const renderPredictAccessory = (predictType: PredictToastType) => {
    const accessoryStyle = {
      paddingRight: 12,
      alignContent: 'center' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    };

    switch (predictType) {
      case PredictToastType.Pending:
        return (
          <Box style={accessoryStyle}>
            <Spinner
              color={ReactNativeDsIconColor.PrimaryDefault}
              spinnerIconProps={{ size: ReactNativeDsIconSize.Lg }}
            />
          </Box>
        );
      case PredictToastType.Success:
        return (
          <View style={accessoryStyle}>
            <Icon
              name={IconName.Confirmation}
              color={theme.colors.success.default}
              size={IconSize.Lg}
            />
          </View>
        );
      case PredictToastType.Failure:
        return (
          <View style={accessoryStyle}>
            <Icon
              name={IconName.Danger}
              color={theme.colors.error.default}
              size={IconSize.Lg}
            />
          </View>
        );
      default:
        return null;
    }
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
            style={styles.avatar}
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
            size={AvatarSize.Md}
            style={styles.avatar}
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
            style={styles.avatar}
          />
        );
      }
      case ToastVariants.Icon: {
        const { iconName, iconColor, backgroundColor } = toastOptions;
        return (
          <Avatar
            variant={AvatarVariant.Icon}
            name={iconName}
            iconColor={iconColor}
            backgroundColor={backgroundColor}
            style={styles.avatar}
          />
        );
      }
      case ToastVariants.Predict: {
        const { predictType } = toastOptions;
        return renderPredictAccessory(predictType);
      }
    }
  };

  const renderToastContent = (options: ToastOptions) => {
    const { labelOptions, descriptionOptions, linkButtonOptions } = options;

    const closeButtonOptions =
      'closeButtonOptions' in options ? options.closeButtonOptions : undefined;
    const startAccessory =
      'startAccessory' in options ? options.startAccessory : undefined;

    const isStartAccessoryValid =
      startAccessory != null && React.isValidElement(startAccessory);

    return (
      <>
        {isStartAccessoryValid ? startAccessory : renderAvatar()}
        <View
          style={styles.labelsContainer}
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
    <Animated.View onLayout={onAnimatedViewLayout} style={baseStyle}>
      {renderToastContent(toastOptions)}
    </Animated.View>
  );
});

export default Toast;
