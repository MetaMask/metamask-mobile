import type { ReactNode } from 'react';

export interface SendAlert {
  key: string;
  title: string;
  message: ReactNode;
  acknowledgeButtonLabel?: string;
}
