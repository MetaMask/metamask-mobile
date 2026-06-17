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
  it('injects analytics prop from useAnalytics', () => {
    const renderSpy = jest.fn();
    const MockComponent = ({ analytics }: IWithAnalyticsAwarenessProps) => {
      renderSpy(analytics);
      return <View />;
    };

    const MockComponentWithAnalytics = withAnalyticsAwareness(MockComponent);

    render(<MockComponentWithAnalytics />);

    // Verify the analytics prop was passed and has the expected structure
    expect(renderSpy).toHaveBeenCalledTimes(1);
    const analyticsProp = renderSpy.mock.calls[0][0];
    expect(analyticsProp).toBeDefined();
    expect(analyticsProp).toHaveProperty('trackEvent');
    expect(analyticsProp).toHaveProperty('createEventBuilder');
    expect(analyticsProp).toHaveProperty('isEnabled');
    expect(analyticsProp).toHaveProperty('enable');
    expect(analyticsProp).toHaveProperty('addTraitsToUser');
  });
});
