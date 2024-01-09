/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import SelectButton from '../SelectButton/SelectButton';
import { ValueListItemProps } from '../../../../ValueList/ValueListItem/ValueListItem.types';
import SelectableWrapper from '../../../foundation/SelectableWrapper/SelectableWrapper';

// Internal dependencies.
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
    const selectButtonContent: ValueListItemProps = value || {
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
    <SelectableWrapper
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
