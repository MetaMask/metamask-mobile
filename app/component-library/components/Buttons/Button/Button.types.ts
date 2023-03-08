// Internal dependencies.
import { ButtonLinkProps } from './variants/ButtonLink/ButtonLink.types';
import { ButtonPrimaryProps } from './variants/ButtonPrimary/ButtonPrimary.types';
import { ButtonSecondaryProps } from './variants/ButtonSecondary/ButtonSecondary.types';

/**
 * Size variants of Button.
 */
export enum ButtonSize {
  Sm = '32',
  Md = '40',
  Lg = '48',
  Auto = 'auto',
}

/**
 * Different types of button width.
 */
export enum ButtonWidthTypes {
  Auto = 'auto',
  Full = 'full',
}

/**
 * Button variants.
 */
export enum ButtonVariants {
  Link = 'Link',
  Primary = 'Primary',
  Secondary = 'Secondary',
}
/**
 * Button component props.
 */
export type ButtonProps =
  | ButtonLinkProps
  | ButtonPrimaryProps
  | ButtonSecondaryProps;
