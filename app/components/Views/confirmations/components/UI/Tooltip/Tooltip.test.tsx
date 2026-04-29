import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import Tooltip from './Tooltip';

describe('Tooltip', () => {
  it('renders the open button', () => {
    const { getByTestId } = render(
      <Tooltip
        title="Tooltip title"
        content={
          <View>
            <Text>Tooltip content to be displayed here!</Text>
          </View>
        }
        tooltipTestId="tooltipTestId"
      />,
    );
    expect(getByTestId('tooltipTestId-open-btn')).toBeOnTheScreen();
  });

  it('should display content when info icon is clicked', async () => {
    const mockOnPress = jest.fn();
    const { getByTestId, getByText } = render(
      <Tooltip
        title="Tooltip title"
        content={
          <View>
            <Text>Tooltip content to be displayed here!</Text>
          </View>
        }
        tooltipTestId="tooltipTestId"
        onPress={mockOnPress}
      />,
    );
    fireEvent.press(getByTestId('tooltipTestId-open-btn'));
    expect(
      getByText('Tooltip content to be displayed here!'),
    ).toBeOnTheScreen();
    expect(mockOnPress).toHaveBeenCalled();
  });
});
