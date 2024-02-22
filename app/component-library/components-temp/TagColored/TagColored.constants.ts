/* eslint-disable import/prefer-default-export */
// Internal dependencies
import { TagColor, TagColoredProps } from './TagColored.types';
import { TextVariant } from '../../components/Texts/Text';

// Defaults
export const DEFAULT_TAGCOLORED_COLOR = TagColor.Default;
export const DEFAULT_TAGCOLORED_TEXTVARIANT = TextVariant.BodyXS;

// Test IDs
export const TAGCOLORED_TESTID = 'tagcolored';
export const TAGCOLORED_TEXT_TESTID = 'tagcolored-text';

// Sample consts
export const SAMPLE_TAGCOLORED_PROPS: TagColoredProps = {
  color: DEFAULT_TAGCOLORED_COLOR,
  children: 'Sample TagColored text',
};
