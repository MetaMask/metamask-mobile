import React from 'react';
import { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip.types';

export interface TooltipContentProps {
  testID: string;
  data?: Record<string, unknown>;
}

export type ContentRenderer = (
  props: TooltipContentProps,
) => React.ReactElement;

export type ContentRegistry = Record<
  PerpsTooltipContentKey,
  ContentRenderer | undefined
>;
