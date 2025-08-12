/* eslint-disable import/prefer-default-export */
// Third party dependencies
import { lightTheme } from '@metamask/design-tokens';

// External dependencies
import {
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT,
  SAMPLE_BUTTONBASE_PROPS,
} from '../../foundation/ButtonBase/ButtonBase.constants';

// Internal dependencies.
import { ButtonPrimaryProps } from './ButtonPrimary.types';

// Test IDs
export const BUTTONPRIMARY_TESTID = 'buttonprimary';

// Defaults
export const DEFAULT_BUTTONPRIMARY_LABEL_TEXTVARIANT =
  DEFAULT_BUTTONBASE_LABEL_TEXTVARIANT;
export const DEFAULT_BUTTONPRIMARY_LABEL_COLOR =
  lightTheme.colors.primary.inverse;

// Samples
export const SAMPLE_BUTTONPRIMARY_PROPS: ButtonPrimaryProps = {
  ...SAMPLE_BUTTONBASE_PROPS,
};
