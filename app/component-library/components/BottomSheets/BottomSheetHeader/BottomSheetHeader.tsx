/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import HeaderBase from '../../HeaderBase';

import ButtonIcon, { ButtonIconSizes } from '../../Buttons/ButtonIcon';
import { IconName, IconColor } from '../../Icons/Icon';

// Internal dependencies.
import styleSheet from './BottomSheetHeader.styles';

import { BOTTOM_SHEET_HEADER_VARIANT_MAP } from './BottomSheetHeader.constants';
import {
  BottomSheetHeaderProps,
  BottomSheetHeaderVariant,
} from './BottomSheetHeader.types';

/**
 * @deprecated Please update your code to use `BottomSheetHeader` from `@metamask/design-system-react-native`.
 * The API may have changed - compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BottomSheetHeader/README.md}
 */
const BottomSheetHeader: React.FC<BottomSheetHeaderProps> = ({
  style,
  children,
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
  variant = BottomSheetHeaderVariant.Compact,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const startAccessory = onBack && (
    <ButtonIcon
      iconName={IconName.ArrowLeft}
      iconColor={IconColor.Default}
      onPress={onBack}
      size={ButtonIconSizes.Md}
      {...backButtonProps}
    />
  );

  const endAccessory = onClose && (
    <ButtonIcon
      iconName={IconName.Close}
      iconColor={IconColor.Default}
      onPress={onClose}
      size={ButtonIconSizes.Lg}
      {...closeButtonProps}
    />
  );

  const headerBaseVariant = BOTTOM_SHEET_HEADER_VARIANT_MAP[variant];

  return (
    <HeaderBase
      style={styles.base}
      startAccessory={startAccessory}
      endAccessory={endAccessory}
      variant={headerBaseVariant}
      {...props}
    >
      {children}
    </HeaderBase>
  );
};

export default BottomSheetHeader;
