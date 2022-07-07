export enum ConfirmationModalVariant {
  Normal = 'Normal',
  Danger = 'Danger',
}

/**
 * ConfirmationModal component props.
 */
export interface ConfirmationModalProps {
  /**
   * Route that contains parameters passed during navigation.
   */
  route: {
    params: {
      variant: ConfirmationModalVariant;
      title: string;
      description: string;
      onConfirm: () => void;
      onCancel?: () => void;
      cancelLabel?: string;
      confirmLabel?: string;
    };
  };
}
