/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef } from 'react';
import type { View } from 'react-native';

// External dependencies.
import DSText, { TextVariant } from '../../Texts/Text';
import { useStyles } from '../../../hooks';
import { IconSize } from '../../Icons/Icon';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';
import { WalletViewSelectorsIDs } from '../../../../components/Views/Wallet/WalletView.testIds';

const PickerAccount = forwardRef<View, PickerAccountProps>(
  ({ style, accountName, hitSlop, onPress, ...props }, ref) => {
    const { styles } = useStyles(styleSheet, { style });

    return (
      <PickerBase
        ref={ref}
        style={styles.base}
        onPress={onPress}
        hitSlop={hitSlop}
        {...props}
        iconSize={IconSize.Sm}
        dropdownIconStyle={styles.dropdownIcon}
      >
        <DSText
          variant={TextVariant.BodyMDMedium}
          testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
          numberOfLines={1}
          style={styles.accountName}
        >
          {accountName}
        </DSText>
      </PickerBase>
    );
  },
);

PickerAccount.displayName = 'PickerAccount';

export default PickerAccount;
