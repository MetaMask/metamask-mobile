/* eslint-disable import/prefer-default-export */
// External dependencies.
import { IconSize } from '../../Icons/Icon';
import { TEST_ICON_PROPS } from '../Icon/Icon.constants';

// Internal dependencies.
import { IconContainerSizes, IconContainerProps } from './IconContainer.types';

/**
 * Mapping of IconSize by IconContainerSizes.
 */
export type IconSizeByIconContainerSizes = {
  [key in IconContainerSizes]: IconSize;
};

export const ICON_SIZE_BY_ICON_CONTAINER_SIZE: IconSizeByIconContainerSizes = {
  [IconContainerSizes.Xs]: IconSize.Xs,
  [IconContainerSizes.Sm]: IconSize.Sm,
  [IconContainerSizes.Md]: IconSize.Md,
  [IconContainerSizes.Lg]: IconSize.Lg,
  [IconContainerSizes.Xl]: IconSize.Xl,
};

export const DEFAULT_ICON_CONTAINER_SIZE = IconContainerSizes.Md;

export const ICON_CONTAINER_TEST_ID = 'icon-container';
export const ICON_CONTAINER_ICON_TEST_ID = 'icon-container-icon';

export const TEST_ICON_CONTAINER_PROPS: IconContainerProps = {
  iconProps: TEST_ICON_PROPS,
};
