import type { ReactNode } from 'react';

export interface DetailRowProps {
  label: string;
  children: ReactNode;
  testID?: string;
  hidden?: boolean;
  error?: boolean;
}
