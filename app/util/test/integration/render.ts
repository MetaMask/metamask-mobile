import React from 'react';
import { renderScreen } from '../renderWithProvider';

/**
 * Render a screen component within the real providers used in the app.
 * Wraps the common render utility to make integration tests consistent.
 */
export function renderIntegrationScreen(
  Component: React.ComponentType,
  options: { name: string },
  providerValues?: Parameters<typeof renderScreen>[2],
  initialParams?: Parameters<typeof renderScreen>[3],
) {
  return renderScreen(Component, options, providerValues, initialParams);
}
