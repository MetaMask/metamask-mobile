/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/prefer-default-export */

// External dependencies.
import { ButtonSize } from '../../Button.types';
import {
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT,
  SAMPLE_BUTTONBASE_PROPS,
} from '../../foundation/ButtonBase/ButtonBase.constants';
import { TextColor } from '../../../../Texts/Text';

// Internal dependencies.
import { ButtonLinkProps } from './ButtonLink.types';

// Defaults
export const DEFAULT_BUTTONLINK_SIZE = ButtonSize.Auto;
export const DEFAULT_BUTTONLINK_LABEL_TEXTVARIANT =
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT;
export const DEFAULT_BUTTONLINK_LABEL_COLOR = TextColor.Primary;
export const DEFAULT_BUTTONLINK_LABEL_COLOR_PRESSED =
  TextColor.PrimaryAlternative;
export const DEFAULT_BUTTONLINK_LABEL_COLOR_ERROR = TextColor.Error;
export const DEFAULT_BUTTONLINK_LABEL_COLOR_ERROR_PRESSED =
  TextColor.ErrorAlternative;

// Samples
export const SAMPLE_BUTTONLINK_PROPS: ButtonLinkProps = {
  ...SAMPLE_BUTTONBASE_PROPS,
};
