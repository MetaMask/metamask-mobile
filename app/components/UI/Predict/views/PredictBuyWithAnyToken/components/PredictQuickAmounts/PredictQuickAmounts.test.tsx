import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import PredictQuickAmounts from './PredictQuickAmounts';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('expo-haptics');

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

  it('calls onSelectAmount with 20 when $20 is pressed', async () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$20'));

    await waitFor(() => {
      expect(mockOnSelectAmount).toHaveBeenCalledWith(20);
    });
  });

  it('calls onSelectAmount with 50 when $50 is pressed', async () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$50'));

    await waitFor(() => {
      expect(mockOnSelectAmount).toHaveBeenCalledWith(50);
    });
  });

  it('calls onSelectAmount with 100 when $100 is pressed', async () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$100'));

    await waitFor(() => {
      expect(mockOnSelectAmount).toHaveBeenCalledWith(100);
    });
  });

  it('calls onSelectAmount with 250 when $250 is pressed', async () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$250'));

    await waitFor(() => {
      expect(mockOnSelectAmount).toHaveBeenCalledWith(250);
    });
  });

  it('triggers haptic feedback when a quick amount button is pressed', async () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} />,
    );

    fireEvent.press(screen.getByText('$50'));

    await waitFor(() => {
      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    });
  });

  it('renders buttons as disabled when disabled prop is true', () => {
    renderWithProvider(
      <PredictQuickAmounts onSelectAmount={mockOnSelectAmount} disabled />,
    );

    expect(screen.getByText('$20')).toBeOnTheScreen();
    expect(screen.getByText('$250')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('$20'));
    expect(mockOnSelectAmount).not.toHaveBeenCalled();
  });
});
