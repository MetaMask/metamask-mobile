/* eslint-disable react/prop-types */
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import AccountAvatar, { AccountAvatarType } from '../AccountAvatar';
import { BaseAvatarSize } from '../BaseAvatar';
import BaseText, { BaseTextVariant } from '../BaseText';
import Link from '../Link';
import styles from './Toast.styles';
import {
  ToastLabelOptions,
  ToastLinkOption,
  ToastOptions,
  ToastRef,
  ToastVariant,
} from './Toast.types';
import NetworkAvatar from '../NetworkAvatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  const showToast = (options: ToastOptions) => {
    if (toastOptions) {
      return;
    }
    setToastOptions(options);
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
        () =>
          (translateYProgress.value = withDelay(
            visibilityDuration,
            withTiming(
              height,
              { duration: animationDuration },
              runOnJS(resetState),
            ),
          )),
      );
    }
  };

  const renderLabel = (labelOptions: ToastLabelOptions) => (
    <BaseText variant={BaseTextVariant.sBodyMD}>
      {labelOptions.map(({ label, isBold }, index) => (
        <BaseText
          key={`toast-label-${index}`}
          variant={
            isBold ? BaseTextVariant.sBodyMDBold : BaseTextVariant.sBodyMD
          }
          style={styles.label}
        >
          {label}
        </BaseText>
      ))}
    </BaseText>
  );

  const renderLink = (linkOption?: ToastLinkOption) =>
    linkOption ? (
      <Link onPress={linkOption.onPress} variant={BaseTextVariant.sBodyMD}>
        {linkOption.label}
      </Link>
    ) : null;

  const renderAvatar = () => {
    switch (toastOptions?.variant) {
      case ToastVariant.Plain:
        return null;
      case ToastVariant.Account: {
        const { accountAddress } = toastOptions;
        return (
          <AccountAvatar
            accountAddress={accountAddress}
            type={AccountAvatarType.JazzIcon}
            size={BaseAvatarSize.Md}
            style={styles.avatar}
          />
        );
      }
      case ToastVariant.Network: {
        {
          const { networkImageUrl } = toastOptions;
          return (
            <NetworkAvatar
              networkImageUrl={networkImageUrl}
              size={BaseAvatarSize.Md}
              style={styles.avatar}
            />
          );
        }
      }
    }
  };

  const renderToastContent = (options: ToastOptions) => {
    const { labelOptions, linkOption } = options;

    return (
      <>
        {renderAvatar()}
        <View style={styles.labelsContainer}>
          {renderLabel(labelOptions)}
          {renderLink(linkOption)}
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
