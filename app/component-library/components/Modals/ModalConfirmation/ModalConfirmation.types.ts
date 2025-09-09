export interface ModalConfirmationParams {
  title: string;
  description: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  isDanger?: boolean;
}
