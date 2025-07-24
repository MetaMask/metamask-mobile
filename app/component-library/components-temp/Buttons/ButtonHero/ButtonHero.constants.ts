/* eslint-disable import/prefer-default-export */

// External dependencies
import { SAMPLE_BUTTONBASE_PROPS } from '../../../components/Buttons/Button/foundation/ButtonBase/ButtonBase.constants';
import { TextVariant, TextColor } from '../../../components/Texts/Text';

// Internal dependencies.
import { ButtonHeroProps } from './ButtonHero.types';

// Test IDs
export const BUTTONHERO_TESTID = 'buttonhero';

// Defaults
export const DEFAULT_BUTTONHERO_LABEL_TEXTVARIANT = TextVariant.BodyMDMedium;
export const DEFAULT_BUTTONHERO_LABEL_COLOR = TextColor.Inverse;

// Sample props
export const SAMPLE_BUTTONHERO_PROPS: ButtonHeroProps = {
  ...SAMPLE_BUTTONBASE_PROPS,
  label: 'Sample ButtonHero',
};