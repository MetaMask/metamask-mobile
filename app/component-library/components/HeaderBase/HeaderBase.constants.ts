// External dependencies.
import { TextVariant } from '@metamask/design-system-react-native';

// Internal dependencies.
import { HeaderBaseVariant } from './HeaderBase.types';

/**
 * Text variant mapping based on HeaderBase variant.
 */
export const HEADERBASE_VARIANT_TEXT_VARIANTS: Record<
  HeaderBaseVariant,
  TextVariant
> = {
  [HeaderBaseVariant.Compact]: TextVariant.HeadingSm,
  [HeaderBaseVariant.Display]: TextVariant.HeadingLg,
};

/**
 * Test IDs for HeaderBase component.
 */
export const HeaderBaseTestIds = {
  CONTAINER: 'header-base-container',
  TITLE: 'header-base-title',
  START_ACCESSORY: 'header-base-start-accessory',
  END_ACCESSORY: 'header-base-end-accessory',
} as const;

// Legacy test IDs for backward compatibility
export const HEADERBASE_TEST_ID = 'header';
export const HEADERBASE_TITLE_TEST_ID = 'header-title';

