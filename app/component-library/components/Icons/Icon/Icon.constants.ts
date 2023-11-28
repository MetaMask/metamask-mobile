/* eslint-disable import/prefer-default-export */
// Internal dependencies.
import { IconName, IconProps, IconSize, IconColor } from './Icon.types';

// Defaults
export const DEFAULT_ICON_SIZE = IconSize.Md;
export const DEFAULT_ICON_COLOR = IconColor.Default;

// Sample consts
export const SAMPLE_ICON_PROPS: IconProps = {
  name: IconName.Add,
  size: DEFAULT_ICON_SIZE,
  color: DEFAULT_ICON_COLOR,
};
