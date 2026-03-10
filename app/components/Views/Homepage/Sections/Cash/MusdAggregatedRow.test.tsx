import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdAggregatedRow from './MusdAggregatedRow';

const mockClaimRewards = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(),
}));

jest.mock('../../../../UI/Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => ({
    tokenBalanceAggregated: '1800.5',
    fiatBalanceAggregatedFormatted: '$1,800.50',
  }),
}));

const mockUseMerklBonusClaim = jest.fn(() => ({
  claimableReward: { amount: '10' },
  hasPendingClaim: false,
  claimRewards: mockClaimRewards,
  isClaiming: false,
}));
jest.mock(
  '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: () => mockUseMerklBonusClaim(),
  }),
);

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: () => false,
}));

jest.mock('../../../../Views/confirmations/hooks/useNetworkName', () => ({
  useNetworkName: () => 'Linea Mainnet',
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

describe('MusdAggregatedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: { amount: '10' },
      hasPendingClaim: false,
      claimRewards: mockClaimRewards,
      isClaiming: false,
    });
  });

  it('renders token name and balances', () => {
    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.getByText('MetaMask USD')).toBeOnTheScreen();
    expect(screen.getByText('$1,800.50')).toBeOnTheScreen();
    expect(screen.getByText(/1,800\.5\s*mUSD/)).toBeOnTheScreen();
  });

  it('renders Claim bonus when claimable and taps call claimRewards and trackEvent', () => {
    renderWithProvider(<MusdAggregatedRow />);

    const claimButton = screen.getByText('Claim bonus');
    expect(claimButton).toBeOnTheScreen();

    fireEvent.press(claimButton);

    expect(mockClaimRewards).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockCreateEventBuilder).toHaveBeenCalled();
  });

  it('has cash-section-musd-row testID', () => {
    renderWithProvider(<MusdAggregatedRow />);
    expect(screen.getByTestId('cash-section-musd-row')).toBeOnTheScreen();
  });

  it('shows Spinner when isClaiming is true', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: { amount: '10' },
      hasPendingClaim: false,
      claimRewards: mockClaimRewards,
      isClaiming: true,
    });

    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.getByTestId('cash-section-musd-row')).toBeOnTheScreen();
    expect(screen.queryByText('Claim bonus')).toBeNull();
  });

  it('shows green "3% bonus" when not claimable', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: null,
      hasPendingClaim: false,
      claimRewards: mockClaimRewards,
      isClaiming: false,
    });

    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.queryByText('Claim bonus')).toBeNull();
    expect(screen.getByText('3% bonus')).toBeOnTheScreen();
  });
});
