import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
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

// Mock useTooltipModal hook
jest.mock('../../../../hooks/useTooltipModal', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    openTooltipModal: jest.fn(),
  })),
}));

// Test wrapper with Navigation
const NavigationWrapper = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>{children}</NavigationContainer>
);

describe('RewardPointsDisplay', () => {
  it('renders null when shouldShow is false', () => {
    const { queryByTestId } = render(
      <RewardPointsDisplay shouldShow={false} />,
      { wrapper: NavigationWrapper },
    );
    expect(queryByTestId('reward-points-display')).toBeNull();
  });

  it('renders error state correctly', () => {
    const { getByText } = render(
      <RewardPointsDisplay shouldShow hasError estimatedPoints={100} />,
      { wrapper: NavigationWrapper },
    );
    expect(getByText("Couldn't load")).toBeTruthy();
  });

  it('renders loaded state with points and discount tag', () => {
    const { getByText } = render(
      <RewardPointsDisplay shouldShow estimatedPoints={1344} bonusBips={150} />,
      { wrapper: NavigationWrapper },
    );

    expect(getByText('1,344')).toBeTruthy();
    expect(getByText('+1.5%')).toBeTruthy();
  });

  it('renders loading state without points display', () => {
    const { queryByText } = render(
      <RewardPointsDisplay shouldShow isLoading estimatedPoints={1000} />,
      { wrapper: NavigationWrapper },
    );

    // Points should not be visible when loading
    expect(queryByText('1,000')).toBeNull();
  });
});
