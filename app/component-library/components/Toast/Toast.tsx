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
import AvatarAccount, { AvatarAccountType } from '../Avatars/AvatarAccount';
import AvatarNetwork from '../Avatars/AvatarNetwork';
import { AvatarBaseSize } from '../Avatars/AvatarBase';
import Text, { TextVariant } from '../Text';
import ButtonLink from '../Buttons/ButtonLink';

// Internal dependencies.
import {
  ToastLabelOptions,
  ToastLinkButtonOptions,
  ToastOptions,
  ToastRef,
  ToastVariant,
} from './Toast.types';
import styles from './Toast.styles';
import { useSelector } from 'react-redux';

const visibilityDuration = 2500;
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
    transform: [{ translateY: translateYProgress.value }],
  }));
  const baseStyle: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>> =
    useMemo(
      () => [styles.base, animatedStyle],
      /* eslint-disable-next-line */
      [],
    );
  const accountAvatarType = useSelector((state: any) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const showToast = (options: ToastOptions) => {
    let timeoutDuration = 0;
    if (toastOptions) {
      // Reset animation.
      cancelAnimation(translateYProgress);
      timeoutDuration = 100;
    }
    setTimeout(() => {
      setToastOptions(options);
    }, timeoutDuration);
  };

  useImperativeHandle(ref, () => ({
    showToast,
  }));

  const resetState = () => setToastOptions(undefined);

  const onAnimatedViewLayout = (e: LayoutChangeEvent) => {
    if (toastOptions) {
      const { height } = e.nativeEvent.layout;
      const translateYToValue = -(bottomPadding + bottomNotchSpacing);

      translateYProgress.value = height;
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
  };

  const renderLabel = (labelOptions: ToastLabelOptions) => (
    <Text variant={TextVariant.sBodyMD}>
      {labelOptions.map(({ label, isBold }, index) => (
        <Text
          key={`toast-label-${index}`}
          variant={isBold ? TextVariant.sBodyMDBold : TextVariant.sBodyMD}
          style={styles.label}
        >
          {label}
        </Text>
      ))}
    </Text>
  );

  const renderButtonLink = (linkButtonOptions?: ToastLinkButtonOptions) =>
    linkButtonOptions && (
      <ButtonLink
        onPress={linkButtonOptions.onPress}
        variant={TextVariant.sBodyMD}
      >
        {linkButtonOptions.label}
      </ButtonLink>
    );

  const renderAvatar = () => {
    switch (toastOptions?.variant) {
      case ToastVariant.Plain:
        return null;
      case ToastVariant.Account: {
        const { accountAddress } = toastOptions;
        return (
          <AvatarAccount
            accountAddress={accountAddress}
            type={accountAvatarType}
            size={AvatarBaseSize.Md}
            style={styles.avatar}
          />
        );
      }
      case ToastVariant.Network: {
        {
          const { networkImageSource } = toastOptions;
          return (
            <AvatarNetwork
              imageSource={networkImageSource}
              size={AvatarBaseSize.Md}
              style={styles.avatar}
            />
          );
        }
      }
    }
  };

  const renderToastContent = (options: ToastOptions) => {
    const { labelOptions, linkButtonOptions } = options;

    return (
      <>
        {renderAvatar()}
        <View style={styles.labelsContainer}>
          {renderLabel(labelOptions)}
          {renderButtonLink(linkButtonOptions)}
        </View>
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
