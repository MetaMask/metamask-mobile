// Third party dependencies.
import React from 'react';
import { ViewProps } from 'react-native';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';

/**
 * Badge component props.
 */
export interface BadgeBaseProps extends ViewProps {
  /**
   * Variant of Badge
   */
  variant?: BadgeVariants;
  /**
   * The content of the badge itself. This can take in any component.
   */
  children: React.ReactNode;
}
