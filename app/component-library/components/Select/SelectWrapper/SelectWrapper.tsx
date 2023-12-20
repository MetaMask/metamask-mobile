/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import SelectButton from '../SelectButton/SelectButton';
import { SelectValueProps } from '../SelectValue/SelectValue.types';

// Internal dependencies.
import SelectWrapperBase from './foundation/SelectWrapperBase';
import { SelectWrapperProps } from './SelectWrapper.types';

const SelectWrapper: React.FC<SelectWrapperProps> = ({
  placeholder = '',
  value,
  selectButtonProps,
  isBottomSheetOpen = false,
  bottomSheetProps,
  ...props
}) => {
  const [isMenuOpened, setIsMenuOpened] = useState(isBottomSheetOpen);

  const onMenuOpen = () => {
    bottomSheetProps?.onOpen?.();
    setIsMenuOpened(true);
  };

  const onMenuClose = (hasPendingAction: boolean) => {
    bottomSheetProps?.onClose?.(hasPendingAction);
    setIsMenuOpened(false);
  };

  const renderTriggerEl = () => {
    const selectButtonContent: SelectValueProps = value || {
      description: placeholder,
    };

    const onPressSelectButton = (event: GestureResponderEvent) => {
      onMenuOpen();
      selectButtonProps?.onPress?.(event);
    };
    return (
      <SelectButton
        {...selectButtonContent}
        {...selectButtonProps}
        onPress={onPressSelectButton}
      />
    );
  };

  return (
    <SelectWrapperBase
      triggerEl={renderTriggerEl()}
      isBottomSheetOpen={isMenuOpened}
      bottomSheetProps={{
        shouldNavigateBack: false,
        ...bottomSheetProps,
        onOpen: onMenuOpen,
        onClose: onMenuClose,
      }}
      {...props}
    />
  );
};

export default SelectWrapper;
