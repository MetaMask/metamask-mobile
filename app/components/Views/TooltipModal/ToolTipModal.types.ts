import { ReactNode } from 'react';

export interface TooltipModalRouteParams {
  title: string;
  tooltip: string | ReactNode;
  footerText?: string;
  buttonText?: string;
  bottomPadding?: number;
}
