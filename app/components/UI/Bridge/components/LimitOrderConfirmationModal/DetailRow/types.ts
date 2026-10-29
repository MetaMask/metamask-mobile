import type { ReactElement, ReactNode } from 'react';

export interface DetailRowProps {
  /**
   * Row label. A string is rendered in the default label style; an element,
   * e.g. an underlined tooltip label, is rendered as is.
   */
  label: string | ReactElement;
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
