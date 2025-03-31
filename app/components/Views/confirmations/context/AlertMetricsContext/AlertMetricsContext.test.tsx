import React from 'react';
import { useAlertMetrics } from './AlertMetricsContext';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn(),
}));

describe('useAlertMetrics', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('provides trackAlertRendered, and trackInlineAlertClicked functions from context', () => {
    (React.useContext as jest.Mock).mockReturnValue({
      trackAlertRendered: jest.fn(),
      trackInlineAlertClicked: jest.fn(),
    });
    const ALERT_KEY_MOCK = 'testKey';
    const { result } = renderHookWithProvider(useAlertMetrics);

    expect(result.current).toBeDefined();
    expect(typeof result.current.trackAlertRendered).toBe('function');
    expect(typeof result.current.trackInlineAlertClicked).toBe('function');

    expect(() => result.current.trackAlertRendered()).not.toThrow();
    expect(() =>
      result.current.trackInlineAlertClicked(ALERT_KEY_MOCK),
    ).not.toThrow();
  });

  it('throws an error if used outside of AlertMetricsProvider', () => {
    expect(() => renderHookWithProvider(() => useAlertMetrics())).toThrow(
      'useAlertMetrics must be used within an AlertMetricsProvider',
    );
  });
});
