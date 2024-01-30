import React, { Component } from 'react';
import { render } from '@testing-library/react-native';
import withMetricsAwareness from './withMetricsAwareness';
import useMetrics from './useMetrics';
import { View } from 'react-native';
import { IMetaMetrics } from '../../../core/Analytics/MetaMetrics.types';

jest.mock('./useMetrics');

interface MockComponentProps {
  metrics: IMetaMetrics;
}

class MockComponent extends Component<MockComponentProps> {
  render() {
    return <View testID="mock-component" />;
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
