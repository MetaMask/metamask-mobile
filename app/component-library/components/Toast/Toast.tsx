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

// External dependencies.
import Avatar, { AvatarSize, AvatarVariant } from '../Avatars/Avatar';
import Text, { TextVariant } from '../Texts/Text';
import Button, { ButtonVariants } from '../Buttons/Button';

// Internal dependencies.
import {
  ToastLabelOptions,
  ToastLinkButtonOptions,
  ToastOptions,
  ToastRef,
  ToastVariants,
} from './Toast.types';
import styles from './Toast.styles';
import { ToastSelectorsIDs } from '../../../../e2e/selectors/wallet/ToastModal.selectors';
import { ButtonProps } from '../Buttons/Button/Button.types';
import { TAB_BAR_HEIGHT } from '../Navigation/TabBar/TabBar.constants';

const visibilityDuration = 2750;
const animationDuration = 250;
const bottomPadding = 16;
const screenHeight = Dimensions.get('window').height;

const Toast = forwardRef((_, ref: React.ForwardedRef<ToastRef>) => {
  const [toastOptions, setToastOptions] = useState<ToastOptions | undefined>(
    undefined,
  );
  const { bottom: bottomNotchSpacing } = useSafeAreaInsets();
  const translateYProgress = useSharedValue(screenHeight);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateYProgress.value - TAB_BAR_HEIGHT }],
  }));
  const baseStyle: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>> =
    useMemo(
      () => [styles.base, animatedStyle],
      /* eslint-disable-next-line */
      [],
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

  const renderButtonLink = (linkButtonOptions?: ToastLinkButtonOptions) =>
    linkButtonOptions && (
      <Button
        variant={ButtonVariants.Link}
        onPress={linkButtonOptions.onPress}
        labelTextVariant={TextVariant.BodyMD}
        label={linkButtonOptions.label}
      />
    );

  const renderCloseButton = (closeButtonOptions?: ButtonProps) => (
    <Button
      variant={ButtonVariants.Primary}
      onPress={() => closeButtonOptions?.onPress()}
      label={closeButtonOptions?.label}
    />
  );

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
    }
  };

  const renderToastContent = (options: ToastOptions) => {
    const {
      labelOptions,
      linkButtonOptions,
      closeButtonOptions,
      startAccessory,
    } = options;

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
          {renderButtonLink(linkButtonOptions)}
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
