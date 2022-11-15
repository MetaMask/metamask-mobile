/* eslint-disable import/prefer-default-export */
// External dependencies.
import { IconSize } from '../Icon';
import { SAMPLE_ICON_PROPS } from '../Icon/Icon.constants';

// Internal dependencies.
import { IconInACircleSizes, IconInACircleProps } from './IconInACircle.types';

/**
 * Mapping of IconSize by IconInACircleSizes.
 */
export type IconSizeByIconInACircleSizes = {
  [key in IconInACircleSizes]: IconSize;
};
export const ICON_SIZE_BY_ICON_CONTAINER_SIZE: IconSizeByIconInACircleSizes = {
  [IconInACircleSizes.Xs]: IconSize.Xs,
  [IconInACircleSizes.Sm]: IconSize.Sm,
  [IconInACircleSizes.Md]: IconSize.Md,
  [IconInACircleSizes.Lg]: IconSize.Lg,
  [IconInACircleSizes.Xl]: IconSize.Xl,
};

// Defaults
export const DEFAULT_ICON_CONTAINER_SIZE = IconInACircleSizes.Md;

// Test IDs
export const ICON_CONTAINER_TEST_ID = 'icon-container';
export const ICON_CONTAINER_ICON_TEST_ID = 'icon-container-icon';

// Sample consts
export const SAMPLE_ICON_CONTAINER_PROPS: IconInACircleProps = {
  iconProps: SAMPLE_ICON_PROPS,
};
