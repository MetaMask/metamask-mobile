import React from 'react';
import { Text, View } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import Tooltip from './Tooltip';

describe('Tooltip', () => {
  it('should match snapshot', async () => {
    const container = render(
      <Tooltip
        title="Tooltip title"
        content={
          <View>
            <Text>Tooltip content to be displayed here!</Text>
          </View>
        }
      />,
    );
    expect(container).toMatchSnapshot();
  });

  it('should display content when info icon is clicked', async () => {
    const { getByTestId, getByText } = render(
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
    fireEvent.press(getByTestId('tooltipTestId-open-btn'));
    expect(getByText('Tooltip content to be displayed here!')).toBeDefined();
  });
});
