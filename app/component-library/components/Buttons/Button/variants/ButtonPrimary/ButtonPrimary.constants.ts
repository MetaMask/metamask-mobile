/* eslint-disable import/prefer-default-export */

// External dependencies.
import {
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT,
  SAMPLE_BUTTONBASE_PROPS,
} from '../../foundation/ButtonBase/ButtonBase.constants';
import { TextColor } from '../../../../Texts/Text';

// Internal dependencies.
import { ButtonPrimaryProps } from './ButtonPrimary.types';

// Defaults
export const DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT =
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT;
export const DEFAULT_BUTTONPRIMARY_LABEL_COLOR = TextColor.Inverse;

// Samples
export const SAMPLE_BUTTONPRIMARY_PROPS: ButtonPrimaryProps = {
  ...SAMPLE_BUTTONBASE_PROPS,
};
