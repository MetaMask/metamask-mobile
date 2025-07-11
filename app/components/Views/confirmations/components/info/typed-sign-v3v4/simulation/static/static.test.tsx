import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import StaticSimulation from './static';

const mockProps = {
  title: 'Test Title',
  titleTooltip: 'Test Tooltip',
  description: 'Test Description',
  simulationElements: <></>,
};

describe('StaticSimulation', () => {
  it('renders correctly with basic props', () => {
    const { getByText } = render(<StaticSimulation {...mockProps} />);

    expect(getByText('Test Title')).toBeDefined();
    expect(getByText('Test Description')).toBeDefined();
  });

  it('shows loader when isLoading is true', () => {
    const { queryByTestId } = render(
      <StaticSimulation {...mockProps} isLoading />,
    );

    expect(queryByTestId('confirm-v3v4-simulation-loader')).toBeDefined();
  });

  it('shows simulation elements when not loading', () => {
    const simulationElements = <Text>Test Simulation</Text>;
    const { getByText } = render(
      <StaticSimulation
        {...mockProps}
        simulationElements={simulationElements}
        isLoading={false}
      />,
    );

    expect(getByText('Test Simulation')).toBeDefined();
  });
});
