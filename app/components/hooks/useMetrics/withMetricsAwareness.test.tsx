import React, { Component } from 'react';
import { render } from '@testing-library/react-native';
import withMetricsAwareness from './withMetricsAwareness';
import useMetrics from './useMetrics';
import { View } from 'react-native';
import { IWithMetricsAwarenessProps } from './withMetricsAwareness.types';

jest.mock('./useMetrics');

class MockComponent extends Component<IWithMetricsAwarenessProps> {
  render() {
    return <View />;
  }
}

describe('withMetricsAwareness', () => {
  it('passes the correct props to the child component', () => {
    (useMetrics as jest.Mock).mockReturnValue({ someProp: 'someValue' });

    const renderSpy = jest.spyOn(MockComponent.prototype, 'render');

    const MockComponentWithMetrics = withMetricsAwareness(MockComponent);
    render(<MockComponentWithMetrics />);

    expect(renderSpy).toHaveBeenCalled();
    expect(renderSpy.mock.instances[0].props).toEqual({
      metrics: { someProp: 'someValue' },
    });

    renderSpy.mockRestore();
  });
});
