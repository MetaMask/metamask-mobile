import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';

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

  it('shows Icon when icon is an IconName', () => {
    const { getByTestId } = renderWithProvider(
      <HighlightedAction
        item={{ ...item, icon: IconName.Add, isLoading: false }}
      />,
    );

    expect(getByTestId('icon')).toBeOnTheScreen();
  });

  describe('loading state', () => {
    it('shows no action buttons when isLoading is true', () => {
      const { queryByText } = renderWithProvider(
        <HighlightedAction item={{ ...item, isLoading: true }} />,
      );

      expect(queryByText('Add')).not.toBeOnTheScreen();
    });

    it('shows action buttons when isLoading is false', () => {
      const { getByText } = renderWithProvider(
        <HighlightedAction item={{ ...item, isLoading: false }} />,
      );

      expect(getByText('Add')).toBeOnTheScreen();
    });
  });
});
