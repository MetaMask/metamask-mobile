/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import HeaderBase from '../../HeaderBase';

import ButtonIcon from '../../Buttons/ButtonIcon';
import { IconName, IconColor } from '../../Icons/Icon';

// Internal dependencies.
import styleSheet from './BottomSheetHeader.styles';

import { BOTTOM_SHEET_HEADER_VARIANT_MAP } from './BottomSheetHeader.constants';
import {
  BottomSheetHeaderProps,
  BottomSheetHeaderVariant,
} from './BottomSheetHeader.types';

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
      {...backButtonProps}
    />
  );

  const endAccessory = onClose && (
    <ButtonIcon
      iconName={IconName.Close}
      iconColor={IconColor.Default}
      onPress={onClose}
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
