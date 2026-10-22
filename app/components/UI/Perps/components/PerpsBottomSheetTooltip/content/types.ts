import React from 'react';
import { PerpsTooltipContentKey } from '../PerpsBottomSheetTooltip.types';

export interface TooltipContentProps {
  testID: string;
  data?: Record<string, unknown>;
  /**
   * Opens another tooltip's content in the same sheet, e.g. the Orange fees
   * explainer from the fees breakdown. The host's "Got it" returns here.
   */
  onOpenNestedInfo?: (contentKey: PerpsTooltipContentKey) => void;
}

export type ContentRenderer = React.ComponentType<TooltipContentProps>;

export type ContentRegistry = Record<
  PerpsTooltipContentKey,
  ContentRenderer | undefined
>;
