// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External Dependencies.
import { AvatarAccountType } from '../Avatars/Avatar/variants/AvatarAccount';
import { ButtonProps } from '../Buttons/Button/Button.types';

/**
 * Toast variants.
 */
export enum ToastVariants {
  Plain = 'Plain',
  Account = 'Account',
  Network = 'Network',
}

/**
 * Options for the main text in the toast.
 */
export type ToastLabelOptions = {
  label: string;
  isBold?: boolean;
}[];

/**
 * Options for displaying a Link in the toast.
 */
export interface ToastLinkButtonOptions {
  label: string;
  onPress: () => void;
}

/**
 * Common toast option shared between all other options.
 */
interface BaseToastVariants {
  hasNoTimeout: boolean;
  labelOptions: ToastLabelOptions;
  linkButtonOptions?: ToastLinkButtonOptions;
  closeButtonOptions?: ButtonProps;
}

/**
 * Plain toast option.
 */
interface PlainToastOption extends BaseToastVariants {
  variant: ToastVariants.Plain;
}

/**
 * Account toast option.
 */
interface AccountToastOption extends BaseToastVariants {
  variant: ToastVariants.Account;
  accountAddress: string;
  accountAvatarType: AvatarAccountType;
}

/**
 * Network toast option.
 */
interface NetworkToastOption extends BaseToastVariants {
  variant: ToastVariants.Network;
  networkName?: string;
  networkImageSource: ImageSourcePropType;
}

/**
 * Different toast options combined in a union type.
 */
export type ToastOptions =
  | PlainToastOption
  | AccountToastOption
  | NetworkToastOption;

/**
 * Toast component reference.
 */
export interface ToastRef {
  showToast: (toastOptions: ToastOptions) => void;
  closeToast: () => void;
}

/**
 * Toast context parameters.
 */
export interface ToastContextParams {
  toastRef: React.RefObject<ToastRef> | undefined;
}
