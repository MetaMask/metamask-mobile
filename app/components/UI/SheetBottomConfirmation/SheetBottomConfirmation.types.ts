/**
 * Object that holds the props that are passed in while navigating.
 */
export interface SheetBottomConfirmationRoute {
  params: {
    /**
     * Title to show in modal.
     */
    title: string;
    /**
     * Description to show in modal.
     */
    description: string;
    /**
     * Optional callback to trigger when pressing the confirm button.
     */
    onConfirm?: () => void;
    /**
     * Optional callback to trigger when pressing the cancel button.
     */
    onCancel?: () => void;
    /**
     * Optional label to set on the cancel button.
     */
    cancelLabel?: string;
    /**
     * Optional label to set on the confirm button.
     */
    confirmLabel?: string;
    /**
     * Optional label to set on the confirm button.
     */
    onDismissed?: () => void;
  };
}

/**
 * SheetBottomConfirmation component props.
 */
export interface SheetBottomConfirmationProps {
  /**
   * Route that contains parameters passed during navigation.
   */
  route: SheetBottomConfirmationRoute;
}
