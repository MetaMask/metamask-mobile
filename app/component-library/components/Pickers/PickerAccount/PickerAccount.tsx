/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef, useState, useCallback } from 'react';
import { TouchableOpacity, View, GestureResponderEvent } from 'react-native';

// External dependencies.
import DSText, { TextVariant } from '../../Texts/Text';
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
    showAddress = true,
    cellAccountContainerStyle = {},
    hitSlop,
    onPress,
    onPressIn,
    onPressOut,
    ...props
  },
  _ref: React.Ref<typeof TouchableOpacity>,
) => {
  const [pressed, setPressed] = useState(false);

  const { styles } = useStyles(styleSheet, {
    style,
    cellAccountContainerStyle,
    pressed,
  });

  const triggerOnPressedIn = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(true);
      onPressIn?.(e);
    },
    [setPressed, onPressIn],
  );

  const triggerOnPressedOut = useCallback(
    (e: GestureResponderEvent) => {
      setPressed(false);
      onPressOut?.(e);
    },
    [setPressed, onPressOut],
  );

  const shortenedAddress = formatAddress(accountAddress, 'short');

  return (
    <View style={styles.pickerAccountContainer}>
      <PickerBase
        iconSize={IconSize.Xs}
        style={pressed ? styles.basePressed : styles.base}
        dropdownIconStyle={styles.dropDownIcon}
        onPress={() => onPress && onPress({} as GestureResponderEvent)}
        onPressIn={triggerOnPressedIn}
        onPressOut={triggerOnPressedOut}
        hitSlop={hitSlop}
        activeOpacity={1}
        {...props}
      >
        <View style={styles.cellAccount}>
          <View style={styles.accountNameLabel}>
            <View style={styles.accountNameAvatar}>
              <DSText
                variant={TextVariant.BodyMDMedium}
                testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
              >
                {accountName}
              </DSText>
            </View>
          </View>
        </View>
      </PickerBase>
      {showAddress && (
        <DSText
          variant={TextVariant.BodySMMedium}
          style={styles.accountAddressLabel}
        >
          {shortenedAddress}
        </DSText>
      )}
    </View>
  );
};

export default forwardRef(PickerAccount);
