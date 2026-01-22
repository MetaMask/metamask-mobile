import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import type { IWithAnalyticsAwarenessProps } from './withAnalyticsAwareness.types';

// Unmock both to test the real implementation
jest.unmock('./withAnalyticsAwareness');
jest.unmock('./useAnalytics');

// Import after unmocking
const { withAnalyticsAwareness } = jest.requireActual(
  './withAnalyticsAwareness',
);

describe('withAnalyticsAwareness', () => {
  it('injects metrics prop from useAnalytics', () => {
    const renderSpy = jest.fn();
    const MockComponent = ({ metrics }: IWithAnalyticsAwarenessProps) => {
      renderSpy(metrics);
      return <View />;
    };

    const MockComponentWithAnalytics = withAnalyticsAwareness(MockComponent);

    render(<MockComponentWithAnalytics />);

    // Verify the metrics prop was passed and has the expected structure
    expect(renderSpy).toHaveBeenCalledTimes(1);
    const metricsProp = renderSpy.mock.calls[0][0];
    expect(metricsProp).toBeDefined();
    expect(metricsProp).toHaveProperty('trackEvent');
    expect(metricsProp).toHaveProperty('createEventBuilder');
    expect(metricsProp).toHaveProperty('isEnabled');
    expect(metricsProp).toHaveProperty('enable');
    expect(metricsProp).toHaveProperty('addTraitsToUser');
  });
});
