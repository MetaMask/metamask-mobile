export enum ToastVariant {
  Plain = 'Plain',
  Account = 'Account',
  Network = 'Network',
}

export type ToastLabelOptions = {
  label: string;
  isBold?: boolean;
}[];

export interface ToastLinkOption {
  label: string;
  onPress: () => void;
}

interface BaseToastVariant {
  labelOptions: ToastLabelOptions;
  linkOption?: ToastLinkOption;
}

interface PlainToastOption extends BaseToastVariant {
  variant: ToastVariant.Plain;
}

interface AccountToastOption extends BaseToastVariant {
  variant: ToastVariant.Account;
  accountAddress: string;
}

interface NetworkToastOption extends BaseToastVariant {
  variant: ToastVariant.Network;
  networkImageUrl: string;
}

export type ToastOptions =
  | PlainToastOption
  | AccountToastOption
  | NetworkToastOption;

export interface ToastRef {
  showToast: (toastOptions: ToastOptions) => void;
}

export interface ToastContextParams {
  toastRef: React.RefObject<ToastRef> | undefined;
}
