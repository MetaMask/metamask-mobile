import { ReactNode } from 'react';

export interface TooltipModalRouteParams {
  title: string;
  tooltip: string | ReactNode;
  footerText?: string;
  buttonText?: string;
  onButtonPress?: () => void;
  /**
   * When `false`, the sheet stays open after `onButtonPress`. Useful when the press
   * opens an external URL and you want the tooltip visible on return.
   * Defaults to `true`.
   */
  dismissOnButtonPress?: boolean;
}
