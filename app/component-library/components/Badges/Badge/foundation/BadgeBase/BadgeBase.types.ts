// Third party dependencies.
import React from 'react';
import { ViewProps } from 'react-native';

// External dependencies.
import { BadgeVariant } from '../../Badge.types';

/**
 * Badge component props.
 */
export interface BadgeBaseProps extends ViewProps {
  /**
   * Optional prop to control the variant of Badge
   */
  variant?: BadgeVariant;
  /**
   * The content of the badge itself. This can take in any component.
   */
  children: React.ReactNode;
}

/**
 * Style sheet BadgeBase parameters.
 */
export type BadgeBaseStyleSheetVars = Pick<BadgeBaseProps, 'style'>;
