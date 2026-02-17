import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HighlightedActionListItem } from '../../../types/token';
import { HighlightedAction } from './highlighted-action';

describe('HighlightedAction', () => {
  const mockOnPress = jest.fn();

  const item: HighlightedActionListItem = {
    type: 'highlighted_action',
    icon: 'https://example.com/perps.png',
    name: 'Perps Balance',
    name_description: '$0.00',
    actions: [
      {
        buttonLabel: 'Add',
        onPress: mockOnPress,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders highlighted action content', () => {
    const { getByText } = renderWithProvider(<HighlightedAction item={item} />);

    expect(getByText('Perps Balance')).toBeOnTheScreen();
    expect(getByText('$0.00')).toBeOnTheScreen();
    expect(getByText('Add')).toBeOnTheScreen();
  });

  it('calls action handler when button is pressed', () => {
    const { getByText } = renderWithProvider(<HighlightedAction item={item} />);

    fireEvent.press(getByText('Add'));

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });
});
