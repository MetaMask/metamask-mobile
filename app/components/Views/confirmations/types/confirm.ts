import { ReactElement } from 'react';

interface Alert {
  alertDetails?: string[];
  component?: ReactElement;
  cta?: { label: string; callback: () => void };
  field?: string;
  isBlocking?: boolean;
  key: string;
  message: string;
  severity: 'danger' | 'warning';
  title: string;
}

export default Alert;
