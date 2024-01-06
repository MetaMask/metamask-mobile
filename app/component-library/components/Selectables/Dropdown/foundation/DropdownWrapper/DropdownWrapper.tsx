/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import DropdownButton from '../DropdownButton/DropdownButton';
import { ValueListItemProps } from '../../../../ValueList/ValueListItem/ValueListItem.types';
import SelectableWrapper from '../../../foundation/SelectableWrapper/SelectableWrapper';

// Internal dependencies.
import { DropdownWrapperProps } from './DropdownWrapper.types';

const DropdownWrapper: React.FC<DropdownWrapperProps> = ({
  placeholder = '',
  value,
  dropdownButtonProps,
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
    const DropdownButtonContent: ValueListItemProps = value || {
      label: placeholder,
    };

    const onPressDropdownButton = (event: GestureResponderEvent) => {
      onMenuOpen();
      dropdownButtonProps?.onPress?.(event);
    };
    return (
      <DropdownButton
        {...DropdownButtonContent}
        {...dropdownButtonProps}
        onPress={onPressDropdownButton}
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

export default DropdownWrapper;
