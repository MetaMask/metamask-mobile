// Internal dependencies.
import { ButtonIconProps } from './variants/ButtonIcon/ButtonIcon.types';
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
 * Button variants.
 */
export enum ButtonVariants {
  Icon = 'Icon',
  Link = 'Link',
  Primary = 'Primary',
  Secondary = 'Secondary',
}
/**
 * Button component props.
 */
export type ButtonProps =
  | ButtonIconProps
  | ButtonLinkProps
  | ButtonPrimaryProps
  | ButtonSecondaryProps;
