import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdAggregatedRow from './MusdAggregatedRow';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockClaimRewards = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn(),
}));

const mockUseMusdBalance = jest.fn(() => ({
  tokenBalanceAggregated: '1800.5',
  fiatBalanceAggregatedFormatted: '$1,800.50',
  hasMusdBalanceOnAnyChain: false,
}));
jest.mock('../../../../UI/Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => mockUseMusdBalance(),
}));

const mockUseMerklBonusClaim = jest.fn(() => ({
  claimableReward: '10' as string | null,
  hasPendingClaim: false,
  claimRewards: mockClaimRewards,
  isClaiming: false,
  error: null as string | null,
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

const mockSelectMoneyHomeScreenEnabledFlag = jest.fn().mockReturnValue(false);
jest.mock('../../../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHomeScreenEnabledFlag: (state: unknown) =>
    mockSelectMoneyHomeScreenEnabledFlag(state),
}));

describe('MusdAggregatedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdBalance.mockReturnValue({
      tokenBalanceAggregated: '1800.5',
      fiatBalanceAggregatedFormatted: '$1,800.50',
      hasMusdBalanceOnAnyChain: false,
    });
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: '10',
      hasPendingClaim: false,
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
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
      claimableReward: '10',
      hasPendingClaim: false,
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
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
      error: null,
    });

    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.queryByText('Claim bonus')).toBeNull();
    expect(screen.getByText('3% bonus')).toBeOnTheScreen();
  });

  describe('handleTokenRowPress', () => {
    it('navigates to Cash tokens full view when Money Home is disabled', () => {
      mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(false);

      renderWithProvider(<MusdAggregatedRow />);

      fireEvent.press(screen.getByTestId('cash-section-musd-row'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      );
    });

    it('navigates to Money Home when Money Home is enabled', () => {
      mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(true);

      renderWithProvider(<MusdAggregatedRow />);

      fireEvent.press(screen.getByTestId('cash-section-musd-row'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ROOT);
    });
  });

  describe('claimable bonus threshold (min $0.01)', () => {
    it('hides Claim bonus when claimable reward is "< 0.01"', () => {
      mockUseMerklBonusClaim.mockReturnValue({
        claimableReward: null,
        hasPendingClaim: false,
        claimRewards: mockClaimRewards,
        isClaiming: false,
        error: null,
      });

      renderWithProvider(<MusdAggregatedRow />);

      expect(screen.queryByText('Claim bonus')).toBeNull();
      expect(screen.getByText('3% bonus')).toBeOnTheScreen();
    });

    it('shows Claim bonus when claimable reward is exactly 0.01', () => {
      mockUseMerklBonusClaim.mockReturnValue({
        claimableReward: '0.01',
        hasPendingClaim: false,
        claimRewards: mockClaimRewards,
        isClaiming: false,
        error: null,
      });

      renderWithProvider(<MusdAggregatedRow />);

      expect(screen.getByText('Claim bonus')).toBeOnTheScreen();
    });

    it('hides Claim bonus when claimable reward is below 0.01', () => {
      mockUseMerklBonusClaim.mockReturnValue({
        claimableReward: null,
        hasPendingClaim: false,
        claimRewards: mockClaimRewards,
        isClaiming: false,
        error: null,
      });

      renderWithProvider(<MusdAggregatedRow />);

      expect(screen.queryByText('Claim bonus')).toBeNull();
      expect(screen.getByText('3% bonus')).toBeOnTheScreen();
    });

    it('shows Claim bonus when claimable reward is above 0.01', () => {
      mockUseMerklBonusClaim.mockReturnValue({
        claimableReward: '0.02',
        hasPendingClaim: false,
        claimRewards: mockClaimRewards,
        isClaiming: false,
        error: null,
      });

      renderWithProvider(<MusdAggregatedRow />);

      expect(screen.getByText('Claim bonus')).toBeOnTheScreen();
    });
  });
});
