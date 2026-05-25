import React from 'react';
import { render, screen } from '@testing-library/react-native';
import QuickBuyBottomSheetSkeleton from './QuickBuyBottomSheetSkeleton';

describe('QuickBuyBottomSheetSkeleton', () => {
  it('renders the loading container', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(screen.getByTestId('quick-buy-content-loading')).toBeOnTheScreen();
  });

  it('renders all four USD preset placeholder buttons', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    ['1', '20', '50', '100'].forEach((preset) => {
      expect(
        screen.getByTestId(`quick-buy-skeleton-preset-${preset}`),
      ).toBeOnTheScreen();
    });
  });

  it('renders the confirm-button skeleton', () => {
    render(<QuickBuyBottomSheetSkeleton />);
    expect(
      screen.getByTestId('quick-buy-skeleton-confirm-button'),
    ).toBeOnTheScreen();
  });
});
