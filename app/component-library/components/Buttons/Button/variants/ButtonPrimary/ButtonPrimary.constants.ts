/* eslint-disable import-x/prefer-default-export */

// External dependencies
import { SAMPLE_BUTTONBASE_PROPS } from '../../foundation/ButtonBase/ButtonBase.constants';
import { TextVariant } from '../../../../Texts/Text';

// Internal dependencies.
import { ButtonPrimaryProps } from './ButtonPrimary.types';

// Test IDs
export const BUTTONPRIMARY_TESTID = 'buttonprimary';

// Defaults
export const DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT = TextVariant.BodyMDMedium;

// Samples
export const SAMPLE_BUTTONPRIMARY_PROPS: ButtonPrimaryProps = {
  ...SAMPLE_BUTTONBASE_PROPS,
};
