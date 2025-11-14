import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import SectionHeader from './SectionHeader';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('SectionHeader', () => {
  const mockOnViewAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and view all text correctly', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader title="Predictions" onViewAll={mockOnViewAll} />,
      { state: initialState },
    );

    expect(getByText('Predictions')).toBeOnTheScreen();
    expect(getByText('View all')).toBeOnTheScreen();
  });

  it('calls onViewAll when view all button is pressed', () => {
    const { getByText } = renderWithProvider(
      <SectionHeader title="Predictions" onViewAll={mockOnViewAll} />,
      { state: initialState },
    );

    fireEvent.press(getByText('View all'));

    expect(mockOnViewAll).toHaveBeenCalledTimes(1);
  });
});
