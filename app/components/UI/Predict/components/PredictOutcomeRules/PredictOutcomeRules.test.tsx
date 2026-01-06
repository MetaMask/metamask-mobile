import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import PredictOutcomeRules from '.';

const initialState = {
  engine: { backgroundState },
};

describe('PredictOutcomeRules', () => {
  const mockDescription = 'This market resolves to Yes if BTC hits $100k.';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when description is empty', () => {
    renderWithProvider(<PredictOutcomeRules description="" />, {
      state: initialState,
    });

    expect(screen.queryByText('Show rules')).toBeNull();
  });

  it('renders collapsed state initially', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} />,
      { state: initialState },
    );

    expect(screen.getByText('Show rules')).toBeOnTheScreen();
    expect(screen.queryByText(mockDescription)).toBeNull();
  });

  it('expands to show rules when pressed', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} />,
      { state: initialState },
    );

    fireEvent.press(screen.getByText('Show rules'));

    expect(screen.getByText('Hide rules')).toBeOnTheScreen();
    expect(screen.getByText(mockDescription)).toBeOnTheScreen();
  });

  it('collapses when pressed again', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} />,
      { state: initialState },
    );

    fireEvent.press(screen.getByText('Show rules'));
    fireEvent.press(screen.getByText('Hide rules'));

    expect(screen.getByText('Show rules')).toBeOnTheScreen();
    expect(screen.queryByText(mockDescription)).toBeNull();
  });

  it('displays title when provided', () => {
    renderWithProvider(
      <PredictOutcomeRules description={mockDescription} title="BTC $100k" />,
      { state: initialState },
    );

    fireEvent.press(screen.getByText('Show rules'));

    expect(screen.getByText('BTC $100k')).toBeOnTheScreen();
  });
});

