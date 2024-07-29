/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef } from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariant } from '../../Avatars/Avatar';
import Text, { TextVariant } from '../../Texts/Text';
import { formatAddress } from '../../../../util/address';
import { useStyles } from '../../../hooks';
import { strings } from '../../../../../locales/i18n';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';
import { AccountListViewSelectorsIDs } from '../../../../../e2e/selectors/AccountListView.selectors';

const PickerAccount: React.ForwardRefRenderFunction<
  TouchableOpacity,
  PickerAccountProps
> = (
  {
    style,
    accountAddress,
    accountName,
    accountAvatarType,
    accountTypeLabel,
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

  const renderCellAccount = () => (
    <View style={styles.cellAccount}>
      <Avatar
        variant={AvatarVariant.Account}
        type={accountAvatarType}
        accountAddress={accountAddress}
        size={AvatarSize.Md}
        style={styles.accountAvatar}
      />
      <View style={styles.accountNameLabel}>
        <Text
          variant={TextVariant.HeadingSMRegular}
          testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
        >
          {accountName}
        </Text>
        {accountTypeLabel && (
          <Text
            variant={TextVariant.BodySM}
            style={styles.accountNameLabelText}
            testID={AccountListViewSelectorsIDs.ACCOUNT_TYPE_LABEL}
          >
            {strings(accountTypeLabel)}
          </Text>
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
