export interface UnsupportedRegionModalProps {
  /**
   * Visibility state of the modal
   */
  isVisible: boolean;

  /**
   * Function called when modal should close
   */
  onClose: () => void;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
