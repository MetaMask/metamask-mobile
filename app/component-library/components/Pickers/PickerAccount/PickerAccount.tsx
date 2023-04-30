/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { Platform, View } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariants } from '../../Avatars/Avatar';
import Text, { TextVariant } from '../../Texts/Text';
import { formatAddress } from '../../../../util/address';
import { useStyles } from '../../../hooks';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { WALLET_ACCOUNT_NAME_LABEL_TEXT } from '../../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';

const PickerAccount = ({
  style,
  accountAddress,
  accountName,
  accountAvatarType,
  showAddress = true,
  cellAccountContainerStyle = {},
  ...props
}: PickerAccountProps) => {
  const { styles } = useStyles(styleSheet, {
    style,
    cellAccountContainerStyle,
  });
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
        <Text
          variant={TextVariant.HeadingSMRegular}
          {...generateTestId(Platform, WALLET_ACCOUNT_NAME_LABEL_TEXT)}
        >
          {accountName}
        </Text>
        {showAddress && (
          <Text variant={TextVariant.BodyMD} style={styles.accountAddressLabel}>
            {shortenedAddress}
          </Text>
        )}
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
