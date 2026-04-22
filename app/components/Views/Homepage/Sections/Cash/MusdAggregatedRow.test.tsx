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

const mockUseMusdBalance = jest.fn(() => ({
  tokenBalanceAggregated: '1800.5',
  fiatBalanceAggregatedFormatted: '$1,800.50',
  hasMusdBalanceOnAnyChain: false,
}));
jest.mock('../../../../UI/Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => mockUseMusdBalance(),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: () => false,
}));

const mockSelectMoneyHomeScreenEnabledFlag = jest.fn().mockReturnValue(false);
jest.mock('../../../../UI/Money/selectors/featureFlags', () => ({
  selectMoneyHomeScreenEnabledFlag: (state: unknown) =>
    mockSelectMoneyHomeScreenEnabledFlag(state),
}));

const mockClaimRewards = jest.fn();
const mockUseMerklBonusClaim = jest.fn(
  (_asset?: unknown, _location?: unknown, _isVisible?: unknown) => ({
    claimableReward: null as string | null,
    hasPendingClaim: false,
    isClaiming: false,
    claimRewards: mockClaimRewards,
    lifetimeBonusClaimed: '0',
  }),
);
jest.mock(
  '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: (...args: [unknown, unknown, unknown?]) =>
      mockUseMerklBonusClaim(...args),
  }),
);

const mockSelectMusdConversionEducationSeen = jest.fn().mockReturnValue(true);
jest.mock('../../../../../reducers/user/selectors', () => ({
  ...jest.requireActual('../../../../../reducers/user/selectors'),
  selectMusdConversionEducationSeen: (state: unknown) =>
    mockSelectMusdConversionEducationSeen(state),
}));

describe('MusdAggregatedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(false);
    mockSelectMusdConversionEducationSeen.mockReturnValue(true);
    mockUseMusdBalance.mockReturnValue({
      tokenBalanceAggregated: '1800.5',
      fiatBalanceAggregatedFormatted: '$1,800.50',
      hasMusdBalanceOnAnyChain: false,
    });
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: null,
      hasPendingClaim: false,
      isClaiming: false,
      claimRewards: mockClaimRewards,
      lifetimeBonusClaimed: '0',
    });
  });

  it('renders token name and balances', () => {
    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.getByText('MetaMask USD')).toBeOnTheScreen();
    expect(screen.getByText('$1,800.50')).toBeOnTheScreen();
    expect(screen.getByText(/1,800\.5\s*mUSD/)).toBeOnTheScreen();
  });

  it('shows green "3% bonus" when no claimable reward', () => {
    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.queryByText('Claim 3% bonus')).toBeNull();
    expect(screen.getByText('3% bonus')).toBeOnTheScreen();
  });

  it('shows blue "Claim 3% bonus" when claimable reward exists', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: '0.02',
      hasPendingClaim: false,
      isClaiming: false,
      claimRewards: mockClaimRewards,
      lifetimeBonusClaimed: '0',
    });

    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.getByText('Claim 3% bonus')).toBeOnTheScreen();
    expect(screen.queryByText('3% bonus')).toBeNull();
  });

  it('calls claimRewards when "Claim 3% bonus" is tapped', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      claimableReward: '0.02',
      hasPendingClaim: false,
      isClaiming: false,
      claimRewards: mockClaimRewards,
      lifetimeBonusClaimed: '0',
    });

    renderWithProvider(<MusdAggregatedRow />);

    fireEvent.press(screen.getByText('Claim 3% bonus'));
    expect(mockClaimRewards).toHaveBeenCalledTimes(1);
  });

  it('has cash-section-musd-row testID', () => {
    renderWithProvider(<MusdAggregatedRow />);
    expect(screen.getByTestId('cash-section-musd-row')).toBeOnTheScreen();
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

    it('navigates to education screen with returnTo when user has not seen education', () => {
      mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(false);
      mockSelectMusdConversionEducationSeen.mockReturnValue(false);

      renderWithProvider(<MusdAggregatedRow />);

      fireEvent.press(screen.getByTestId('cash-section-musd-row'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          returnTo: { screen: Routes.WALLET.CASH_TOKENS_FULL_VIEW },
        },
      });
    });

    it('navigates directly to CashTokensFullView when education already seen', () => {
      mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(false);
      mockSelectMusdConversionEducationSeen.mockReturnValue(true);

      renderWithProvider(<MusdAggregatedRow />);

      fireEvent.press(screen.getByTestId('cash-section-musd-row'));

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.WALLET.CASH_TOKENS_FULL_VIEW,
      );
    });

    it('navigates to MONEY.ROOT when isMoneyHomeEnabled is true (regardless of education)', () => {
      mockSelectMoneyHomeScreenEnabledFlag.mockReturnValue(true);
      mockSelectMusdConversionEducationSeen.mockReturnValue(false);

      renderWithProvider(<MusdAggregatedRow />);

      fireEvent.press(screen.getByTestId('cash-section-musd-row'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.ROOT);
    });
  });
});
