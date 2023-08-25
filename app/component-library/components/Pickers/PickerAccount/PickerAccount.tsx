/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { KeyringTypes } from '@metamask/keyring-controller';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariants } from '../../Avatars/Avatar';
import Text, { TextVariant } from '../../Texts/Text';
import { formatAddress, getAddressAccountType } from '../../../../util/address';
import { useStyles } from '../../../hooks';
import { strings } from '../../../../../locales/i18n';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { WALLET_ACCOUNT_NAME_LABEL_TEXT } from '../../../../../wdio/screen-objects/testIDs/Screens/WalletView.testIds';

const PickerAccount: React.ForwardRefRenderFunction<
  TouchableOpacity,
  PickerAccountProps
> = (
  {
    style,
    accountAddress,
    accountName,
    accountAvatarType,
    showAddress = true,
    cellAccountContainerStyle = {},
    ...props
  },
  ref,
) => {
  const { styles } = useStyles(styleSheet, {
    style,
    cellAccountContainerStyle,
  });
  const shortenedAddress = formatAddress(accountAddress, 'short');
  const ledgerLabel = KeyringTypes.ledger;
  const isLedgerAccount = getAddressAccountType(accountAddress) === ledgerLabel;
  const label = strings(`accounts.${KeyringTypes.ledger.toLowerCase()}`);

  const renderCellAccount = () => (
    <View style={styles.cellAccount}>
      <Avatar
        variant={AvatarVariants.Account}
        type={accountAvatarType}
        accountAddress={accountAddress}
        size={AvatarSize.Md}
        style={styles.accountAvatar}
      />
      <View style={styles.accountNameLabel}>
        <Text
          variant={TextVariant.HeadingSMRegular}
          {...generateTestId(Platform, WALLET_ACCOUNT_NAME_LABEL_TEXT)}
        >
          {accountName}
        </Text>
        {isLedgerAccount && (
          <Text style={styles.accountNameLabelText}>{label}</Text>
        )}
        {showAddress && (
          <Text variant={TextVariant.BodyMD} style={styles.accountAddressLabel}>
            {shortenedAddress}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <PickerBase style={styles.base} {...props} ref={ref}>
      {renderCellAccount()}
    </PickerBase>
  );
};

export default forwardRef(PickerAccount);
