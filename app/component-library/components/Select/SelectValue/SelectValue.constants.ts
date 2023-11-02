/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextVariant, TextColor } from '../../Texts/Text';

// Internal dependencies.
import { SelectValueProps } from './SelectValue.types';

// Defaults
export const DEFAULT_SELECTVALUE_TITLE_TEXTVARIANT = TextVariant.BodyMD;
export const DEFAULT_SELECTVALUE_TITLE_TEXTCOLOR = TextColor.Default;
export const DEFAULT_SELECTVALUE_DESCRIPTION_TEXTVARIANT = TextVariant.BodySM;
export const DEFAULT_SELECTVALUE_DESCRIPTION_TEXTCOLOR = TextColor.Alternative;

// Sample consts
export const SAMPLE_SELECTVALUE_PROPS: SelectValueProps = {
  title: 'Sample SelectValue title',
  description: 'Sample SelectValue description',
};
