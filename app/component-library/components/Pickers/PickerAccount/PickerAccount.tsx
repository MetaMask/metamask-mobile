/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariants } from '../../Avatars/Avatar';
import Text, { TextVariant } from '../../Texts/Text';
import { formatAddress } from '../../../../util/address';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';

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
      <Avatar
        variant={AvatarVariants.Account}
        type={accountAvatarType}
        accountAddress={accountAddress}
        size={AvatarSize.Md}
        style={styles.accountAvatar}
      />
      <View>
        <Text variant={TextVariant.HeadingSMRegular}>{accountName}</Text>
        <Text variant={TextVariant.BodyMD} style={styles.accountAddressLabel}>
          {shortenedAddress}
        </Text>
      </View>
    </View>
  );

  return (
    <PickerBase style={styles.base} {...props}>
      {renderCellAccount()}
    </PickerBase>
  );
};

export default PickerAccount;
