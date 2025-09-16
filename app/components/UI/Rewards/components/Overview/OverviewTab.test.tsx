import React from 'react';
import { render } from '@testing-library/react-native';
import { OverviewTab } from './OverviewTab';

// Mock the WaysToEarn component
jest.mock('./WaysToEarn/WaysToEarn', () => ({
  WaysToEarn: () => {
    const React = jest.requireActual('react');
    const { Text } = jest.requireActual('react-native');
    return React.createElement(
      Text,
      { testID: 'ways-to-earn' },
      'WaysToEarn Component',
    );
  },
}));

describe('OverviewTab', () => {
  it('renders the OverviewTab component', () => {
    // Arrange & Act
    const { getByTestId } = render(<OverviewTab />);

    // Assert
    expect(getByTestId('ways-to-earn')).toBeOnTheScreen();
  });

  it('renders WaysToEarn component content', () => {
    // Arrange & Act
    const { getByText } = render(<OverviewTab />);

    // Assert
    expect(getByText('WaysToEarn Component')).toBeOnTheScreen();
  });

  it('renders without crashing', () => {
    // Arrange & Act
    const renderComponent = () => render(<OverviewTab />);

    // Assert
    expect(renderComponent).not.toThrow();
  });
});
