/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../hooks';
import AvatarAccount from '../AvatarAccount';
import BaseText, { BaseTextVariant } from '../BaseText';
import PickerItem from '../PickerItem';
import styleSheet from './PickerAccount.styles';
import { PickerAccountProps } from './PickerAccount.types';
import { AvatarSize } from '../Avatar';
import { formatAddress } from '../../../util/address';

const PickerAccount = ({
  style,
  accountAddress,
  accountName,
  accountAvatarType,
  ...props
}: PickerAccountProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const shortenedAddress = formatAddress(accountAddress, 'short');

  const renderCellAccount = () => (
    <View style={styles.cellAccount}>
      <AvatarAccount
        type={accountAvatarType}
        accountAddress={accountAddress}
        size={AvatarSize.Md}
        style={styles.accountAvatar}
      />
      <View>
        <BaseText variant={BaseTextVariant.lHeadingSMRegular}>
          {accountName}
        </BaseText>
        <BaseText
          variant={BaseTextVariant.lBodyMD}
          style={styles.accountAddressLabel}
        >
          {shortenedAddress}
        </BaseText>
      </View>
    </View>
  );

  return (
    <PickerItem style={styles.base} {...props}>
      {renderCellAccount()}
    </PickerItem>
  );
};

export default PickerAccount;
