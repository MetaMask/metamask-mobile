import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import YourBonusCard from './YourBonusCard';
import { YourBonusCardTestIds } from './YourBonusCard.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useMerklBonusClaim } from '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock(
  '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: jest.fn(),
  }),
);

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

jest.mock('../../../SimulationDetails/FiatDisplay/useFiatFormatter', () => ({
  __esModule: true,
  default: () => (amount: { toString: () => string }) =>
    `$${amount.toString()}`,
}));

const mockUseMerklBonusClaim = jest.mocked(useMerklBonusClaim);
const mockUseMusdBalance = jest.mocked(useMusdBalance);

const baseClaimData = {
  claimableReward: null,
  lifetimeBonusClaimed: null,
  hasPendingClaim: false,
  isClaiming: false,
  error: null,
  claimRewards: jest.fn(),
  refetch: jest.fn(),
};

const mockBalance = (fiatBalanceAggregated: string | undefined) =>
  ({
    fiatBalanceAggregated,
    fiatBalanceAggregatedFormatted: fiatBalanceAggregated
      ? `$${fiatBalanceAggregated}`
      : undefined,
    fiatBalanceByChain: {},
    fiatBalanceFormattedByChain: {},
    tokenBalanceAggregated: '0',
    hasMusdBalanceOnAnyChain: false,
  }) as ReturnType<typeof useMusdBalance>;

describe('YourBonusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMusdBalance.mockReturnValue(mockBalance('1000'));
  });

  it('returns null when user has no bonus history and nothing to claim', () => {
    mockUseMerklBonusClaim.mockReturnValue({ ...baseClaimData });
    const { queryByTestId } = renderWithProvider(<YourBonusCard />);
    expect(queryByTestId(YourBonusCardTestIds.CONTAINER)).toBeNull();
  });

  it('renders enabled "Claim $X.XX bonus" when reward is claimable', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: '3.65',
      lifetimeBonusClaimed: '0.00',
    });
    const { getByTestId, getByText } = renderWithProvider(<YourBonusCard />);
    expect(getByTestId(YourBonusCardTestIds.CONTAINER)).toBeOnTheScreen();
    expect(getByText('Claim $3.65 bonus')).toBeOnTheScreen();
  });

  it('renders disabled "Accruing next bonus" when no claim is available but lifetime is set', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: null,
      lifetimeBonusClaimed: '3.56',
    });
    const { getByText, getByTestId } = renderWithProvider(<YourBonusCard />);
    expect(getByText('Accruing next bonus')).toBeOnTheScreen();
    expect(
      getByTestId(YourBonusCardTestIds.LIFETIME_CLAIMED),
    ).toHaveTextContent('+$3.56');
  });

  it('disables claim button while a claim is in flight', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: '3.65',
      lifetimeBonusClaimed: '0.00',
      isClaiming: true,
    });
    const { getByTestId } = renderWithProvider(<YourBonusCard />);
    fireEvent.press(getByTestId(YourBonusCardTestIds.CLAIM_BUTTON));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to ClaimBonusSheet when claim is tapped', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: '3.65',
      lifetimeBonusClaimed: '0.00',
    });
    const { getByTestId } = renderWithProvider(<YourBonusCard />);
    fireEvent.press(getByTestId(YourBonusCardTestIds.CLAIM_BUTTON));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.CLAIM_BONUS_SHEET,
      params: { location: 'money_hub' },
    });
  });

  it('renders estimated annual bonus computed from balance × bonus APY', () => {
    mockUseMusdBalance.mockReturnValue(mockBalance('1000'));
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: '3.65',
      lifetimeBonusClaimed: '0.00',
    });
    const { getByTestId } = renderWithProvider(<YourBonusCard />);
    expect(
      getByTestId(YourBonusCardTestIds.ESTIMATED_ANNUAL),
    ).toHaveTextContent('$30');
  });
});
