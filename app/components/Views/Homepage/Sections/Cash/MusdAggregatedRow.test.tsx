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

jest.mock(
  '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: () => ({
      claimableReward: null,
      hasPendingClaim: false,
      isClaiming: false,
      claimRewards: jest.fn(),
      lifetimeBonusClaimed: '0',
    }),
  }),
);

describe('MusdAggregatedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdBalance.mockReturnValue({
      tokenBalanceAggregated: '1800.5',
      fiatBalanceAggregatedFormatted: '$1,800.50',
      hasMusdBalanceOnAnyChain: false,
    });
  });

  it('renders token name and balances', () => {
    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.getByText('MetaMask USD')).toBeOnTheScreen();
    expect(screen.getByText('$1,800.50')).toBeOnTheScreen();
    expect(screen.getByText(/1,800\.5\s*mUSD/)).toBeOnTheScreen();
  });

  it('shows green "3% bonus" instead of Claim bonus', () => {
    renderWithProvider(<MusdAggregatedRow />);

    expect(screen.queryByText('Claim bonus')).toBeNull();
    expect(screen.getByText('3% bonus')).toBeOnTheScreen();
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
  });
});
