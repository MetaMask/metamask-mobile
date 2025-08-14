// External dependencies.
import { TextVariant } from '../Texts/Text';

// Internal dependencies.
import { HeaderBaseVariant } from './HeaderBase.types';

// Text variants for different header variants
export const HEADERBASE_VARIANT_TEXT_VARIANTS = {
  [HeaderBaseVariant.Display]: TextVariant.HeadingLG,
  [HeaderBaseVariant.Compact]: TextVariant.HeadingSM,
};

// Test IDs
export const HEADERBASE_TEST_ID = 'header';
export const HEADERBASE_TITLE_TEST_ID = 'header-title';
