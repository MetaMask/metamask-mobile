/* eslint-disable react/prop-types */

// Third party dependencies.
import React, { useState } from 'react';
import { GestureResponderEvent } from 'react-native';

// External dependencies.
import BottomSheet from '../../../components/BottomSheets/BottomSheet';

// Internal dependencies.
import { BaseSelectableWrapperProps } from './BaseSelectableWrapper.types';

const BaseSelectableWrapper: React.FC<BaseSelectableWrapperProps> = ({
  triggerEl,
  isBottomSheetOpen = false,
  bottomSheetProps,
  children,
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
  const hasOnPress = triggerEl.props.onPress;
  const onPressTriggerEl = (event: GestureResponderEvent) => {
    onMenuOpen();

    // Invoke the original onPress function if it exists
    if (hasOnPress) {
      triggerEl.props.onPress?.(event);
    }
  };

  const renderTriggerEl = () =>
    React.cloneElement(triggerEl, {
      ...triggerEl.props,
      onPress: onPressTriggerEl,
    });
  return (
    <>
      {renderTriggerEl()}
      {isMenuOpened && (
        <BottomSheet
          shouldNavigateBack={false}
          {...bottomSheetProps}
          onOpen={onMenuOpen}
          onClose={onMenuClose}
        >
          {children}
        </BottomSheet>
      )}
    </>
  );
};

export default BaseSelectableWrapper;
