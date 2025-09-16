import React from 'react';
import { render } from '@testing-library/react-native';
import RewardPointsDisplay from './RewardPointsDisplay';

// Mock the Rive component
jest.mock('rive-react-native', () => ({
  __esModule: true,
  default: 'Rive',
  Alignment: { CenterRight: 'CenterRight' },
  Fit: { FitHeight: 'FitHeight' },
}));

// Mock the Bridge hook
jest.mock('../../../Bridge/hooks/useRewardsIconAnimation', () => ({
  useRewardsIconAnimation: jest.fn(() => ({
    riveRef: { current: null },
  })),
}));

describe('RewardPointsDisplay', () => {
  it('renders null when shouldShow is false', () => {
    const { queryByTestId } = render(
      <RewardPointsDisplay shouldShow={false} />,
    );
    expect(queryByTestId('reward-points-display')).toBeNull();
  });

  it('renders error state correctly', () => {
    const { getByText } = render(
      <RewardPointsDisplay
        shouldShow
        hasError
        estimatedPoints={100}
      />,
    );
    expect(getByText('Unable to load')).toBeTruthy();
  });

  it('renders loaded state with points and discount tag', () => {
    const { getByText } = render(
      <RewardPointsDisplay
        shouldShow
        estimatedPoints={1344}
        feeDiscountPercentage={22}
        bonusBips={150}
      />,
    );

    expect(getByText('1,344')).toBeTruthy();
    expect(getByText('+1.5%')).toBeTruthy();
    expect(getByText('-22%')).toBeTruthy();
  });

  it('renders loading state without points display', () => {
    const { queryByText } = render(
      <RewardPointsDisplay
        shouldShow
        isLoading
        estimatedPoints={1000}
      />,
    );

    // Points should not be visible when loading
    expect(queryByText('1,000')).toBeNull();
  });

  it('does not render discount tag when no discount', () => {
    const { queryByText } = render(
      <RewardPointsDisplay
        shouldShow
        estimatedPoints={1000}
        feeDiscountPercentage={0}
      />,
    );

    expect(queryByText(/-\d+%/)).toBeNull();
  });
});
