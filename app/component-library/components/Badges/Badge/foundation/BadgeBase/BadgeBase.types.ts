// Third party dependencies.
import React from 'react';
import { ViewProps } from 'react-native';

/**
 * Badge component props.
 */
export interface BadgeBaseProps extends ViewProps {
  /**
   * The content of the badge itself. This can take in any component.
   */
  children: React.ReactNode;
}

/**
 * Style sheet input parameters.
 */
export type BadgeBaseStyleSheetVars = Pick<BadgeBaseProps, 'style'>;
