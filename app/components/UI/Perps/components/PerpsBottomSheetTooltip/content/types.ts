import React from 'react';
import { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip.types';

export interface TooltipContentProps {
  testID: string;
}

export type ContentRenderer = React.ComponentType<TooltipContentProps>;

export type ContentRegistry = Record<
  PerpsTooltipContentKey,
  ContentRenderer | undefined
>;
