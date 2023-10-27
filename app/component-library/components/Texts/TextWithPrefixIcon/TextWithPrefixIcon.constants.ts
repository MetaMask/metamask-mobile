/* eslint-disable import/prefer-default-export */
// External dependencies.
import { TextColor, TextVariant } from '../Text/Text.types';
import { IconName, IconSize, IconColor } from '../../Icons/Icon';

// Internal dependencies.
import { TextWithPrefixIconProps } from './TextWithPrefixIcon.types';

// Defaults
export const DEFAULT_TEXTWITHPREFIXICON_COLOR = TextColor.Default;

// Test IDs
export const TEXT_WITH_PREFIX_ICON_TEST_ID = 'text-with-prefix-icon';
export const TEXT_WITH_PREFIX_ICON_ICON_TEST_ID = 'text-with-prefix-icon-icon';
export const TEXT_WITH_PREFIX_ICON_TEXT_TEST_ID = 'text-with-prefix-icon-text';

// Sample consts
export const TEST_SAMPLE_TEXT = 'Sample Text';

export const SAMPLE_TEXTWITHPREFIXICON_PROPS: TextWithPrefixIconProps = {
  variant: TextVariant.BodyMD,
  children: TEST_SAMPLE_TEXT,
  color: TextColor.Default,
  iconProps: {
    size: IconSize.Md,
    name: IconName.Add,
    color: IconColor.Default,
  },
};
