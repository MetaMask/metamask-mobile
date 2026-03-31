import React from 'react';
import LedgerDeviceUnresponsiveError from '../LedgerDeviceUnresponsiveError';
import type { ErrorComponentProps } from '../types';

const DeviceUnresponsiveError = ({ isBusy, onRetry }: ErrorComponentProps) => (
  <LedgerDeviceUnresponsiveError isBusy={isBusy} onRetry={onRetry} />
);

export default DeviceUnresponsiveError;
