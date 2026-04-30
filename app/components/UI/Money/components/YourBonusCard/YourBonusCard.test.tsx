import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import YourBonusCard from './YourBonusCard';
import { YourBonusCardTestIds } from './YourBonusCard.testIds';
import { useMerklBonusClaim } from '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim';
import { useMusdBalance } from '../../../Earn/hooks/useMusdBalance';

const mockClaimRewards = jest.fn(() => Promise.resolve(undefined));

jest.mock(
  '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: jest.fn(),
  }),
);

jest.mock('../../../Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseMerklBonusClaim = jest.mocked(useMerklBonusClaim);
const mockUseMusdBalance = jest.mocked(useMusdBalance);

const baseClaimData = {
  claimableReward: null,
  lifetimeBonusClaimed: null,
  hasPendingClaim: false,
  isClaiming: false,
  error: null,
  claimRewards: mockClaimRewards,
  refetch: jest.fn(),
};

const mockBalance = (musdBalance: string | undefined) =>
  ({
    fiatBalanceAggregated: musdBalance,
    fiatBalanceAggregatedFormatted: musdBalance ? `$${musdBalance}` : undefined,
    fiatBalanceByChain: {},
    fiatBalanceFormattedByChain: {},
    tokenBalanceAggregated: musdBalance ?? '0',
    hasMusdBalanceOnAnyChain: !!musdBalance,
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

  it('returns null for eligible users who have never claimed (lifetime "0.00" with no claimable)', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      lifetimeBonusClaimed: '0.00',
    });
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
    expect(mockClaimRewards).not.toHaveBeenCalled();
  });

  it('dispatches claimRewards and tracks the click event when claim is tapped', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: '3.65',
      lifetimeBonusClaimed: '0.00',
    });
    const { getByTestId } = renderWithProvider(<YourBonusCard />);
    fireEvent.press(getByTestId(YourBonusCardTestIds.CLAIM_BUTTON));
    expect(mockClaimRewards).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate claim presses via isClaimPressedRef guard', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: '3.65',
      lifetimeBonusClaimed: '0.00',
    });
    const { getByTestId } = renderWithProvider(<YourBonusCard />);
    const button = getByTestId(YourBonusCardTestIds.CLAIM_BUTTON);
    fireEvent.press(button);
    fireEvent.press(button);
    expect(mockClaimRewards).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
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
    ).toHaveTextContent('$30.00');
  });
});
