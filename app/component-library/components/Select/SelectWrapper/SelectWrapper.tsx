/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState, useCallback, useRef } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import SelectButton from '../SelectButton/SelectButton';
import BottomSheet, { BottomSheetRef } from '../../BottomSheets/BottomSheet';
import { SelectValueProps } from '../SelectValue/SelectValue.types';

// Internal dependencies.
import styleSheet from './SelectWrapper.styles';
import { SelectWrapperProps } from './SelectWrapper.types';

const SelectWrapper: React.FC<SelectWrapperProps> = ({
  style,
  placeholder = '',
  value,
  triggerComponent,
  selectButtonProps,
  isOpen = false,
  onChange,
  children,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const [isMenuOpened, setIsMenuOpened] = useState(isOpen);
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const onMenuOpen = useCallback(() => {
    setIsMenuOpened(true);
    onChange?.();
  }, [setIsMenuOpened, onChange]);

  const onMenuClose = useCallback(() => {
    setIsMenuOpened(false);
    onChange?.();
  }, [setIsMenuOpened, onChange]);

  const selectButtonContent: SelectValueProps = value || {
    description: placeholder,
  };

  return (
    <View style={styles.base}>
      {triggerComponent || (
        <SelectButton
          {...selectButtonContent}
          {...selectButtonProps}
          onPress={onMenuOpen}
        />
      )}
      {isMenuOpened && (
        <BottomSheet ref={bottomSheetRef} onClose={onMenuClose}>
          {children}
        </BottomSheet>
      )}
    </View>
  );
};

export default SelectWrapper;
