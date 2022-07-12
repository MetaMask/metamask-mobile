export enum ToastVariant {
  Account = 'Account',
  Network = 'Network',
}

interface ToastLabelOption {
  label: string;
  isBold?: boolean;
}

interface BaseToastVariant {
  labelOptions: ToastLabelOption[];
}

interface AccountToastVariant extends BaseToastVariant {
  type: ToastVariant.Account;
  accountAddress: string;
}

interface NetworkToastVariant extends BaseToastVariant {
  type: ToastVariant.Network;
  networkImageUrl: string;
}

export type ToastOptions = AccountToastVariant | NetworkToastVariant;

export interface ToastRef {
  showToast: (toastOptions: ToastOptions) => void;
}

/**
 * Style sheet input parameters.
 */
export type ToastStyleSheetVars = {};
