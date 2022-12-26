/**
 * ModalConfirmation variants.
 */
export enum ModalConfirmationVariants {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * Object that holds the props that are passed in while navigating.
 */
export interface ModalConfirmationRoute {
  params: {
    /**
     * Optional variant to set on the modal.
     * @default Normal
     */
    variant?: ModalConfirmationVariants;
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
  };
}

/**
 * ModalConfirmation component props.
 */
export interface ModalConfirmationProps {
  /**
   * Route that contains parameters passed during navigation.
   */
  route: ModalConfirmationRoute;
}
