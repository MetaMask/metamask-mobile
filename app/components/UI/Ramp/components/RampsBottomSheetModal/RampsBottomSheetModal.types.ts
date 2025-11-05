export interface RampsBottomSheetModalParams {
  /**
   * Title of the modal - can be a string or React node
   */
  title: string | React.ReactNode;

  /**
   * Description/content of the modal - can be a string or React node
   */
  description: string | React.ReactNode;

  /**
   * Label for the primary button (default: "Got it")
   */
  buttonLabel?: string;

  /**
   * Callback when button is pressed
   */
  onButtonPress?: () => void;

  /**
   * Whether to show the close icon in header (default: true)
   */
  showCloseIcon?: boolean;
}

export interface RampsBottomSheetModalProps {
  route: {
    params: RampsBottomSheetModalParams;
  };
}
