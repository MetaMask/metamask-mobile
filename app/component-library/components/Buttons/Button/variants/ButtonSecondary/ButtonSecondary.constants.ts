/* eslint-disable import-x/prefer-default-export */

// External dependencies.
import { SAMPLE_BUTTONBASE_PROPS } from '../../foundation/ButtonBase/ButtonBase.constants';
import { TextVariant } from '../../../../Texts/Text';

// Internal dependencies.
import { ButtonSecondaryProps } from './ButtonSecondary.types';

// Defaults
export const DEFAULT_BUTTONSECONDARY_LABEL_TEXTVARIANT =
  TextVariant.BodyMDMedium;

// Samples
export const SAMPLE_BUTTONSECONDARY_PROPS: ButtonSecondaryProps = {
  ...SAMPLE_BUTTONBASE_PROPS,
};
