import React from 'react';
import DeviceNotFoundState from '../../components/DeviceNotFoundState';
import type { ErrorComponentProps } from '../types';

const DeviceNotFoundError = ({ onRetry }: ErrorComponentProps) => (
  <DeviceNotFoundState onRetry={onRetry} />
);

export default DeviceNotFoundError;
