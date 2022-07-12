/* eslint-disable react/prop-types */
import ButtonReveal from '../../../components/UI/ButtonReveal';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';
import { useStyles } from '../../hooks';
import AccountAvatar, { AccountAvatarType } from '../AccountAvatar';
import { BaseAvatarSize } from '../BaseAvatar';
import BaseText, { BaseTextVariant } from '../BaseText';
import Link from '../Link';
import styleSheet from './Toast.styles';
import { ToastOptions, ToastRef } from './Toast.types';

const Toast = forwardRef((_, ref: React.ForwardedRef<ToastRef>) => {
  const animationProgress = useSharedValue(1);
  const { styles } = useStyles(styleSheet, { animationProgress });
  const [toastOptions, setToastOptions] = useState<ToastOptions | undefined>(
    undefined,
  );

  useImperativeHandle(
    ref,
    () => ({
      showToast: setToastOptions,
    }),
    [setToastOptions],
  );

  // useEffect(() => {
  //   animationProgress.value = withTiming(0, { duration: 5000 });
  // }, [props]);

  const renderAccountAvatar = (accountAddress: string) => (
    <AccountAvatar
      accountAddress={accountAddress}
      type={AccountAvatarType.JazzIcon}
      size={BaseAvatarSize.Md}
      style={styles.avatar}
    />
  );
  const labelInfo = [
    {
      label: 'Hiding',
    },
    {
      label: ' Network',
      isBold: true,
    },
    {
      label: ' tokens.',
    },
  ];

  const renderLabel = (label: string) => (
    <BaseText variant={BaseTextVariant.sBodyMD}>
      {labelInfo.map(({ label, isBold }) => (
        <BaseText
          variant={
            isBold ? BaseTextVariant.sBodyMDBold : BaseTextVariant.sBodyMD
          }
          style={styles.label}
        >
          {label}
        </BaseText>
      ))}
    </BaseText>

    // <BaseText variant={BaseTextVariant.sBodyMD} style={styles.label}>
    //   {label}
    // </BaseText>
  );

  const renderLink = (label: string) => (
    <Link onPress={() => {}} variant={BaseTextVariant.sBodyMD}>
      {label}
    </Link>
  );

  const triggerPress = () => {
    'worklet';
    animationProgress.value = withTiming(1.2, { duration: 400 });
  };

  return (
    <View>
      <Animated.View
        style={[
          styles.base,
          { transform: [{ scale: animationProgress.value }] },
        ]}
      >
        {renderAccountAvatar(
          '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
        )}

        <TouchableOpacity
          style={{ justifyContent: 'center', flex: 1 }}
          onPress={triggerPress}
        >
          {renderLabel('HELLO')}

          {/* {renderLink('Press me!')} */}
        </TouchableOpacity>
        {/* <ButtonReveal onLongPress={() => {}} label={'woot'} /> */}
        {/* {icon && (
        <Icon
          color={labelColor}
          name={icon}
          size={IconSize.Sm}
          style={styles.icon}
        />
      )} */}
        {/* <BaseText variant={BaseTextVariant.sBodyMD} style={styles.label}>
        {label}
      </BaseText> */}
      </Animated.View>
    </View>
  );
});

export default Toast;
