import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsMarketListEmptyState from './PerpsMarketListEmptyState';

describe('PerpsMarketListEmptyState', () => {
  const mockOnCtaPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders description and CTA when cta props are provided', () => {
    render(
      <PerpsMarketListEmptyState
        containerTestID="empty-container"
        description="No markets match your current filter."
        ctaLabel="Clear filter"
        onCtaPress={mockOnCtaPress}
        ctaTestID="empty-cta"
      />,
    );

    expect(screen.getByTestId('empty-container')).toBeOnTheScreen();
    expect(
      screen.getByText('No markets match your current filter.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('empty-cta')).toBeOnTheScreen();
    expect(screen.getByText('Clear filter')).toBeOnTheScreen();
  });

  it('calls onCtaPress when CTA is pressed', () => {
    render(
      <PerpsMarketListEmptyState
        description="No markets match your current filter."
        ctaLabel="Clear filter"
        onCtaPress={mockOnCtaPress}
        ctaTestID="empty-cta"
      />,
    );

    fireEvent.press(screen.getByTestId('empty-cta'));

    expect(mockOnCtaPress).toHaveBeenCalledTimes(1);
  });

  it('renders description without actionButtonProps when ctaTestID is omitted', () => {
    render(
      <PerpsMarketListEmptyState
        containerTestID="empty-container"
        description="No markets match your current filter."
        ctaLabel="Clear filter"
        onCtaPress={mockOnCtaPress}
      />,
    );

    expect(screen.getByTestId('empty-container')).toBeOnTheScreen();
    expect(
      screen.getByText('No markets match your current filter.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Clear filter')).toBeOnTheScreen();
    expect(screen.queryByTestId('empty-cta')).not.toBeOnTheScreen();
  });

  it('renders description without CTA when action props are omitted', () => {
    render(
      <PerpsMarketListEmptyState
        containerTestID="empty-container"
        description="No markets match your current filter."
      />,
    );

    expect(screen.getByTestId('empty-container')).toBeOnTheScreen();
    expect(
      screen.getByText('No markets match your current filter.'),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Clear filter')).not.toBeOnTheScreen();
  });
});
