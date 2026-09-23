import type { ReactNode } from 'react';

export interface DetailRowProps {
  label: string;
  /**
   * Optional accessory rendered right after the label, e.g. an info tooltip
   * button.
   */
  labelAccessory?: ReactNode;
  children: ReactNode;
  testID?: string;
  hidden?: boolean;
  error?: boolean;
}
