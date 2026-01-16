/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { forwardRef, useState, useCallback } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../../components/Base/TouchableOpacity';
import DSText, { TextVariant } from '../../Texts/Text';
import { useStyles } from '../../../hooks';
import { IconSize } from '../../Icons/Icon';

// Internal dependencies.
import PickerBase from '../PickerBase';
import { PickerAccountProps } from './PickerAccount.types';
import styleSheet from './PickerAccount.styles';
import { WalletViewSelectorsIDs } from '../../../../components/Views/Wallet/WalletView.testIds';

const PickerAccount: React.ForwardRefRenderFunction<
  typeof TouchableOpacity,
  PickerAccountProps
> = (
  { style, accountName, hitSlop, onPress, onPressIn, onPressOut, ...props },
  _ref: React.Ref<typeof TouchableOpacity>,
) => {
  const [pressed, setPressed] = useState(false);

  const { styles } = useStyles(styleSheet, {
    style,
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

  return (
    <PickerBase
      iconSize={IconSize.Sm}
      style={pressed ? styles.basePressed : styles.base}
      dropdownIconStyle={styles.dropDownIcon}
      onPress={onPress}
      onPressIn={triggerOnPressedIn}
      onPressOut={triggerOnPressedOut}
      hitSlop={hitSlop}
      activeOpacity={1}
      {...props}
    >
      <DSText
        variant={TextVariant.BodyMDMedium}
        testID={WalletViewSelectorsIDs.ACCOUNT_NAME_LABEL_TEXT}
        numberOfLines={1}
      >
        {accountName}
      </DSText>
    </PickerBase>
  );
};

export default forwardRef(PickerAccount);
