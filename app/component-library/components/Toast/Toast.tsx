/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks';
import AccountAvatar, { AccountAvatarType } from '../AccountAvatar';
import { BaseAvatarSize } from '../BaseAvatar';
import BaseText, { BaseTextVariant } from '../BaseText';
import Link from '../Link';
import styleSheet from './Toast.styles';
import { ToastProps } from './Toast.types';

const Toast = ({ ...props }: ToastProps) => {
  const { styles } = useStyles(styleSheet, {});

  const renderAccountAvatar = (accountAddress: string) => (
    <AccountAvatar
      accountAddress={accountAddress}
      type={AccountAvatarType.JazzIcon}
      size={BaseAvatarSize.Md}
      style={styles.avatar}
    />
  );

  const renderLabel = (label: string) => (
    <BaseText variant={BaseTextVariant.sBodyMD} style={styles.label}>
      {label}
    </BaseText>
  );

  const renderLink = (label: string) => (
    <Link onPress={() => {}} variant={BaseTextVariant.sBodyMD}>
      {label}
    </Link>
  );

  return (
    <View style={styles.base}>
      {renderAccountAvatar(
        '0x10e08af911f2e489480fb2855b24771745d0198b50f5c55891369844a8c57092',
      )}
      <View>
        {renderLabel('HELLO')}
        {renderLink('Press me!')}
      </View>
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
    </View>
  );
};

export default Toast;
