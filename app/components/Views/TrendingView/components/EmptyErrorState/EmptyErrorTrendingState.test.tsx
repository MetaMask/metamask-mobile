import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmptyErrorTrendingState from './EmptyErrorTrendingState';

describe('EmptyErrorTrendingState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders empty state', () => {
    const { getByText } = render(
      <EmptyErrorTrendingState onRetry={() => true} />,
    );

    expect(getByText('Trending tokens is not available')).toBeDefined();
    expect(getByText("We can't fetch this page right now")).toBeDefined();
    expect(getByText('Try again')).toBeDefined();
  });

  it('calls onRetry when button is pressed', () => {
    const mockOnRetry = jest.fn();
    const { getByText } = render(
      <EmptyErrorTrendingState onRetry={mockOnRetry} />,
    );

    const retryButton = getByText('Try again');

    fireEvent.press(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });
});
