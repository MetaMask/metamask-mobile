/* eslint-disable import/prefer-default-export */

// External dependencies
import { TextVariant } from '../../../components/Texts/Text';
import { IconName } from '../../../components/Icons/Icon';

// Internal dependencies.
import { ButtonHeroProps } from './ButtonHero.types';

// Test IDs
export const BUTTONHERO_TESTID = 'buttonhero';

// Defaults
export const DEFAULT_BUTTONHERO_LABEL_TEXTVARIANT = TextVariant.BodyMDMedium;

// Sample props
export const SAMPLE_BUTTONHERO_PROPS: ButtonHeroProps = {
  label: 'Sample ButtonHero',
  onPress: () => {
    console.log('ButtonHero pressed');
  },
};
