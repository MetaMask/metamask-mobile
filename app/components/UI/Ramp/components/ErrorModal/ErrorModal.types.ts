export interface ErrorModalProps {
  /**
   * Visibility state of the modal
   */
  isVisible: boolean;

  /**
   * Function called when modal should close
   */
  onClose: () => void;

  /**
   * Optional custom title for the error modal
   */
  title?: string;

  /**
   * Optional custom description for the error modal
   */
  description?: string;

  /**
   * Optional test ID for testing
   */
  testID?: string;
}
