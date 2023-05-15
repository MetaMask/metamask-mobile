/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/prefer-default-export */

// External dependencies.
import { ButtonSize, ButtonVariants } from '../../Button.types';
import { DEFAULT_TEXT_VARIANT } from '../../../../Texts/Text/Text.constants';
import { SAMPLE_BUTTONBASE_PROPS } from '../../foundation/ButtonBase/ButtonBase.constants';

// Internal dependencies.
import { ButtonLinkProps } from './ButtonLink.types';

// Defaults
export const DEFAULT_BUTTONLINK_SIZE = ButtonSize.Auto;
export const DEFAULT_BUTTONLINK_TEXTVARIANT = DEFAULT_TEXT_VARIANT;

// Samples
export const SAMPLE_BUTTONLINK_PROPS: ButtonLinkProps = {
  ...SAMPLE_BUTTONBASE_PROPS,
  textVariant: DEFAULT_BUTTONLINK_TEXTVARIANT,
};
