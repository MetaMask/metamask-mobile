/* eslint-disable react/prop-types */
// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';

// External dependencies
import { formatAddress } from '../../../util/address';
import { useStyles } from '../../hooks';
import AccountAvatar from '../AccountAvatar';
import { BaseAvatarSize } from '../BaseAvatar';
import BaseText, { BaseTextVariant } from '../BaseText';
import PickerItem from '../PickerItem';

// Internal dependencies
import styleSheet from './PickerAccount.styles';
import { PickerAccountProps } from './PickerAccount.types';

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
      <AccountAvatar
        type={accountAvatarType}
        accountAddress={accountAddress}
        size={BaseAvatarSize.Md}
        style={styles.accountAvatar}
      />
      <View>
        <BaseText variant={BaseTextVariant.sHeadingSMRegular}>
          {accountName}
        </BaseText>
        <BaseText
          variant={BaseTextVariant.sBodyMD}
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
