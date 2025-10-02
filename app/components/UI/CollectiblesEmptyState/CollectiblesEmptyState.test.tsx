// Third party dependencies.
import React from 'react';
import { fireEvent } from '@testing-library/react-native';

// Testing utilities
import renderWithProvider from '../../../util/test/renderWithProvider';

// Internal dependencies.
import { CollectiblesEmptyState } from './CollectiblesEmptyState';

describe('CollectiblesEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with default props', () => {
    const { getByText } = renderWithProvider(<CollectiblesEmptyState />);

    expect(
      getByText(
        "There's a world of NFTs out there. Start your collection today.",
      ),
    ).toBeDefined();
    // Button should not render when no onAction is provided
  });

  it('calls onAction when action button is pressed', () => {
    const mockOnAction = jest.fn();
    const { getByText } = renderWithProvider(
      <CollectiblesEmptyState onAction={mockOnAction} />,
    );

    fireEvent.press(getByText('Import NFTs'));
    expect(mockOnAction).toHaveBeenCalledTimes(1);
  });
});
