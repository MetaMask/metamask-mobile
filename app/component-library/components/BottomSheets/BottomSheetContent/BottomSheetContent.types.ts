// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * BottomSheetContent component props.
 */
export interface BottomSheetContentProps extends ViewProps {
  /**
   * Content to wrap to display.
   */
  children?: React.ReactNode;
  /**
   * Optional prop to toggle full screen state of BottomSheetContent.
   */
  isFullscreen?: boolean;
}
