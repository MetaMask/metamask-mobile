/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef } from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import Avatar, { AvatarSize, AvatarVariant } from '../../Avatars/Avatar';
import Text, { TextVariant } from '../../Texts/Text';
import { formatAddress } from '../../../../util/address';
import { useStyles } from '../../../hooks';
import { IconSize } from '../../Icons/Icon';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';

const PickerAccount: React.ForwardRefRenderFunction<
  typeof TouchableOpacity,
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

  const renderCellAccount = () => (
    <View style={styles.cellAccount}>
      <View style={styles.accountNameLabel}>
        <View style={styles.accountNameAvatar}>
          <Avatar
            variant={AvatarVariant.Account}
            type={accountAvatarType}
            accountAddress={accountAddress}
            size={AvatarSize.Xs}
            style={styles.accountAvatar}
          />
          <Text
            variant={TextVariant.BodyMDMedium}
            testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
          >
            {accountName}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.pickerAccountContainer}>
      <PickerBase
        iconSize={IconSize.Xs}
        style={styles.base}
        dropdownIconStyle={styles.dropDownIcon}
        {...props}
        ref={ref}
      >
        {renderCellAccount()}
      </PickerBase>
      {showAddress && (
        <Text
          variant={TextVariant.BodySMMedium}
          style={styles.accountAddressLabel}
        >
          {shortenedAddress}
        </Text>
      )}
    </View>
  );
};

export default forwardRef(PickerAccount);
