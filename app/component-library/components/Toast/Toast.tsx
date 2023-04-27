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
  Platform,
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
import Avatar, { AvatarSize, AvatarVariants } from '../Avatars/Avatar';
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
import generateTestId from '../../../../wdio/utils/generateTestId';
import { TOAST_ID } from '../../../../wdio/screen-objects/testIDs/Common.testIds';

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
    transform: [{ translateY: translateYProgress.value }],
  }));
  const baseStyle: StyleProp<Animated.AnimateStyle<StyleProp<ViewStyle>>> =
    useMemo(
      () => [styles.base, animatedStyle],
      /* eslint-disable-next-line */
      [],
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
        textVariant={TextVariant.BodyMD}
        label={linkButtonOptions.label}
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
            variant={AvatarVariants.Account}
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
            variant={AvatarVariants.Network}
            name={networkName}
            imageSource={networkImageSource}
            size={AvatarSize.Md}
            style={styles.avatar}
          />
        );
      }
    }
  };

  const renderToastContent = (options: ToastOptions) => {
    const { labelOptions, linkButtonOptions } = options;

    return (
      <>
        {renderAvatar()}
        <View
          style={styles.labelsContainer}
          {...generateTestId(Platform, TOAST_ID)}
        >
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
