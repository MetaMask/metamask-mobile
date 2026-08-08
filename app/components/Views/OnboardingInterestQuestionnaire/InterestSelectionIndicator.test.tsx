import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { InterestSelectionIndicator } from './InterestSelectionIndicator';
import { InterestSelectionIndicatorTestIds } from './InterestSelectionIndicator.testIds';

describe('InterestSelectionIndicator', () => {
  it('renders when selected', () => {
    render(<InterestSelectionIndicator isSelected />);

    expect(
      screen.getByTestId(InterestSelectionIndicatorTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });

  it('renders when not selected', () => {
    render(<InterestSelectionIndicator isSelected={false} />);

    expect(
      screen.getByTestId(InterestSelectionIndicatorTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });
});
