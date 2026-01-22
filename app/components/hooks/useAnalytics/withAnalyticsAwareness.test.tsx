import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import withAnalyticsAwareness from './withAnalyticsAwareness';
import useAnalytics from './useAnalytics';
import type { IUseAnalyticsHook } from './useAnalytics.types';
import type { IWithAnalyticsAwarenessProps } from './withAnalyticsAwareness.types';

jest.mock('./useAnalytics');

describe('withAnalyticsAwareness', () => {
  it('injects metrics prop from useAnalytics', () => {
    const mockAnalytics = { someProp: 'someValue' } as unknown as IUseAnalyticsHook;
    const renderSpy = jest.fn();
    const mockUseAnalytics = useAnalytics as jest.MockedFunction<
      typeof useAnalytics
    >;
    const MockComponent = ({ metrics }: IWithAnalyticsAwarenessProps) => {
      renderSpy(metrics);
      return <View />;
    };

    mockUseAnalytics.mockReturnValue(mockAnalytics);

    const MockComponentWithAnalytics = withAnalyticsAwareness(MockComponent);

    render(<MockComponentWithAnalytics />);

    expect(renderSpy).toHaveBeenCalledWith(mockAnalytics);
  });
});
