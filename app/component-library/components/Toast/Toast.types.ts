// Third party dependencies.
import { ImageSourcePropType } from 'react-native';

// External Dependencies.
import { AvatarAccountType } from '../Avatars/Avatar/variants/AvatarAccount';
import { ButtonProps } from '../Buttons/Button/Button.types';
import { ButtonIconProps } from '../Buttons/ButtonIcon/ButtonIcon.types';
import { IconName } from '../Icons/Icon';
import { ReactElement } from 'react';

/**
 * Toast variants.
 */
export enum ToastVariants {
  Plain = 'Plain',
  Account = 'Account',
  Network = 'Network',
  App = 'App',
  Icon = 'Icon',
}

/**
 * Options for the main text in the toast.
 */
export type ToastLabelOptions = {
  label: string;
  isBold?: boolean;
}[];

/**
 * Options for the description text in the toast.
 */
export interface ToastDescriptionOptions {
  description: string;
}

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
  descriptionOptions?: ToastDescriptionOptions;
  linkButtonOptions?: ToastLinkButtonOptions;
  closeButtonOptions?: ToastCloseButtonOptions;
  startAccessory?: ReactElement;
  customBottomOffset?: number;
}

export type ToastCloseButtonOptions =
  | ButtonProps
  | (ButtonIconProps & { variant: ButtonIconVariant });

export enum ButtonIconVariant {
  Icon = 'Icon',
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
 * App toast option.
 */
interface AppToastOption extends BaseToastVariants {
  variant: ToastVariants.App;
  appIconSource: ImageSourcePropType;
}

interface IconToastOption extends BaseToastVariants {
  variant: ToastVariants.Icon;
  iconName: IconName;
  iconColor?: string;
  backgroundColor?: string;
}

/**
 * Different toast options combined in a union type.
 */
export type ToastOptions =
  | PlainToastOption
  | AccountToastOption
  | NetworkToastOption
  | AppToastOption
  | IconToastOption;

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
