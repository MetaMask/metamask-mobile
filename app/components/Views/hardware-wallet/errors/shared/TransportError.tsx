import React from 'react';
import LedgerConnectionError from '../connection/LedgerConnectionError';
import type { ErrorComponentProps } from '../types';

const TransportError = ({
  errorCode,
  isBusy,
  onRetry,
}: ErrorComponentProps) => (
  <LedgerConnectionError
    errorCode={
      errorCode as Parameters<typeof LedgerConnectionError>[0]['errorCode']
    }
    isBusy={isBusy}
    onRetry={onRetry}
  />
);

export default TransportError;
