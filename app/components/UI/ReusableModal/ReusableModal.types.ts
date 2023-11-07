import { ViewProps } from 'react-native';

/**
 * ReusableModal component props.
 */
export interface ReusableModalProps extends ViewProps {
  /**
   * Content to wrap for multiselect.
   */
  children: React.ReactNode;
  /**
   * Optional callback that gets triggered when modal is dismissed.
   */
  onDismiss?: (hasPendingAction: boolean) => void;
  /**
   * Optional boolean that indicates if modal is swippable. This affects whether or not tapping on the overlay will dismiss the sheet as well.
   * @default true
   */
  isInteractable?: boolean;
}

export type ReusableModalPostCallback = () => void;

export interface ReusableModalRef {
  dismissModal: (callback?: ReusableModalPostCallback) => void;
}
