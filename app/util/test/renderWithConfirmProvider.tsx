import React from 'react';
import {
  RenderResult,
} from '@testing-library/react-native';

import renderWithProvider from './renderWithProvider';
import { AlertMetricsProvider } from '../../components/Views/confirmations/context/AlertMetricsContext/AlertMetricsContext';

export const renderWithConfirmProvider = (
  ui: React.ReactElement,
  { state }: { state?: Record<string, unknown> } = {}
): RenderResult => renderWithProvider(
  <AlertMetricsProvider>
    {ui}
  </AlertMetricsProvider>,
  { state }
);
