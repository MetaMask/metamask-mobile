// Third party dependencies.
import { ViewProps, TouchableOpacityProps } from 'react-native';
import { ReactElement } from 'react';

// External dependencies.
import { BottomSheetProps } from '../../../components/BottomSheets/BottomSheet/BottomSheet.types';

/**
 * BaseSelectableWrapper component props.
 */
export interface BaseSelectableWrapperProps extends ViewProps {
  /**
   * Optional boolean to control the open/close state of the BottomSheet
   */
  isBottomSheetOpen?: boolean;
  /**
   * Optional enum to override the trigger element
   */
  triggerEl: ReactElement<TouchableOpacityProps>;
  /**
   * Optional enum to control props for the BottomSheet
   */
  bottomSheetProps?: Omit<BottomSheetProps, 'children'>;
}
