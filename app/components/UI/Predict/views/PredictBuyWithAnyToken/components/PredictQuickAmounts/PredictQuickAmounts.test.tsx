import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import PredictQuickAmounts from './PredictQuickAmounts';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

describe('PredictQuickAmounts', () => {
  const mockOnSelectAmount = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all four quick amount buttons', () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    expect(screen.getByText('$20')).toBeOnTheScreen();
    expect(screen.getByText('$50')).toBeOnTheScreen();
    expect(screen.getByText('$100')).toBeOnTheScreen();
    expect(screen.getByText('$250')).toBeOnTheScreen();
  });

  it('calls onSelectAmount with 20 when $20 is pressed', () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$20'));

    expect(mockOnSelectAmount).toHaveBeenCalledWith(20);
  });

  it('calls onSelectAmount with 50 when $50 is pressed', () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$50'));

    expect(mockOnSelectAmount).toHaveBeenCalledWith(50);
  });

  it('calls onSelectAmount with 100 when $100 is pressed', () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$100'));

    expect(mockOnSelectAmount).toHaveBeenCalledWith(100);
  });

  it('calls onSelectAmount with 250 when $250 is pressed', () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$250'));

    expect(mockOnSelectAmount).toHaveBeenCalledWith(250);
  });

  it('renders buttons as disabled when disabled prop is true', () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} disabled />,
    );

    expect(screen.getByText('$20')).toBeOnTheScreen();
    expect(screen.getByText('$250')).toBeOnTheScreen();
  });
});
