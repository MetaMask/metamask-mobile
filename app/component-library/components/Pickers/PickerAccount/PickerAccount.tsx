/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';

import AvatarAccount from '../../Avatars/AvatarAccount';
import Text, { TextVariant } from '../../Text';
import { AvatarBaseSize } from '../../Avatars/AvatarBase';
import { formatAddress } from '../../../../util/address';
import { useStyles } from '../../../hooks';

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
      <AvatarAccount
        type={accountAvatarType}
        accountAddress={accountAddress}
        size={AvatarBaseSize.Md}
        style={styles.accountAvatar}
      />
      <View>
        <Text variant={TextVariant.lHeadingSMRegular}>{accountName}</Text>
        <Text variant={TextVariant.lBodyMD} style={styles.accountAddressLabel}>
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
