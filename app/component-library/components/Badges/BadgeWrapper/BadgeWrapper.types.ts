// 3rd party dependencies.
import React from 'react';
import { BadgeProps } from '../Badge/Badge.types.ts';

/**
 * BadgeWrapper component props.
 */
export type BadgeWrapperProps = BadgeProps & {
  /**
   * Element to wrap and to apply a badge component.
   */
  children: React.ReactNode;
};

/**
 * Style sheet input parameters.
 */
export type BadgeWrapperStyleSheetVars = Pick<BadgeWrapperProps, 'style'>;
