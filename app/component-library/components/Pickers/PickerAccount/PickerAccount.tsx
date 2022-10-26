/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariants } from '../../Avatars/Avatar';
import Text, { TextVariants } from '../../Texts/Text';
import { formatAddress } from '../../../../util/address';
import { useStyles } from '../../../hooks';
import { toDataUrl } from '../../../../util/blockies';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { AvatarAccountType, PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';

const PickerAccount = ({
  style,
  accountAddress,
  accountAvatarType,
  accountName,
  ...props
}: PickerAccountProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const shortenedAddress = formatAddress(accountAddress, 'short');

  const renderCellAccount = () => (
    <View style={styles.cellAccount}>
      {accountAvatarType === AvatarAccountType.Blockies && (
        <Avatar
          variant={AvatarVariants.Image}
          imageSource={{ uri: toDataUrl(accountAddress) }}
          size={AvatarSize.Md}
          style={styles.accountAvatar}
        />
      )}
      {accountAvatarType === AvatarAccountType.JazzIcon && (
        <Avatar
          variant={AvatarVariants.JazzIcon}
          address={accountAddress}
          size={AvatarSize.Md}
          style={styles.accountAvatar}
        />
      )}
      <View>
        <Text variant={TextVariants.sHeadingSMRegular}>{accountName}</Text>
        <Text variant={TextVariants.sBodyMD} style={styles.accountAddressLabel}>
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
