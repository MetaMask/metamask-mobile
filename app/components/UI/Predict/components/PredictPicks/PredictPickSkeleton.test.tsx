import React from 'react';
import { render, screen } from '@testing-library/react-native';
import PredictPickSkeleton from './PredictPickSkeleton';

describe('PredictPickSkeleton', () => {
  it('renders container with default testID', () => {
    render(<PredictPickSkeleton />);

    expect(screen.getByTestId('predict-pick-skeleton')).toBeOnTheScreen();
  });

  it('renders container with custom testID', () => {
    const customTestId = 'custom-skeleton';

    render(<PredictPickSkeleton testID={customTestId} />);

    expect(screen.getByTestId(customTestId)).toBeOnTheScreen();
  });

  it('renders title skeleton element', () => {
    render(<PredictPickSkeleton />);

    expect(screen.getByTestId('predict-pick-skeleton-title')).toBeOnTheScreen();
  });

  it('renders pnl skeleton element', () => {
    render(<PredictPickSkeleton />);

    expect(screen.getByTestId('predict-pick-skeleton-pnl')).toBeOnTheScreen();
  });

  it('renders button skeleton element', () => {
    render(<PredictPickSkeleton />);

    expect(
      screen.getByTestId('predict-pick-skeleton-button'),
    ).toBeOnTheScreen();
  });

  it('renders all skeleton elements with custom testID prefix', () => {
    const customTestId = 'my-skeleton';

    render(<PredictPickSkeleton testID={customTestId} />);

    expect(screen.getByTestId(customTestId)).toBeOnTheScreen();
    expect(screen.getByTestId(`${customTestId}-title`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${customTestId}-pnl`)).toBeOnTheScreen();
    expect(screen.getByTestId(`${customTestId}-button`)).toBeOnTheScreen();
  });
});
