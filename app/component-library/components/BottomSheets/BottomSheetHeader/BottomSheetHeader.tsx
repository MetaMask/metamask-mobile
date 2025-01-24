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
import { BottomSheetHeaderProps } from './BottomSheetHeader.types';

const BottomSheetHeader: React.FC<BottomSheetHeaderProps> = ({
  style,
  children,
  onBack,
  onClose,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const startAccessory = onBack && (
    <ButtonIcon
      iconName={IconName.ArrowLeft}
      iconColor={IconColor.Default}
      onPress={onBack}
    />
  );

  const endAccessory = onClose && (
    <ButtonIcon
      iconName={IconName.Close}
      iconColor={IconColor.Default}
      onPress={onClose}
    />
  );

  return (
    <HeaderBase
      style={styles.base}
      startAccessory={startAccessory}
      endAccessory={endAccessory}
      {...props}
    >
      {children}
    </HeaderBase>
  );
};

export default BottomSheetHeader;
