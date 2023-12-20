// Third party dependencies.
import { ViewProps } from 'react-native';

// External dependencies.
import { BottomSheetProps } from '../../../BottomSheets/BottomSheet/BottomSheet.types';

/**
 * SelectWrapperBase component props.
 */
export interface SelectWrapperBaseProps extends ViewProps {
  /**
   * Optional boolean to control the open/close state of the BottomSheet
   */
  isBottomSheetOpen?: boolean;
  /**
   * Optional enum to override the trigger element
   */
  triggerEl?: React.ReactNode;
  /**
   * Optional enum to control props for the BottomSheet
   */
  bottomSheetProps?: Omit<BottomSheetProps, 'children'>;
}
