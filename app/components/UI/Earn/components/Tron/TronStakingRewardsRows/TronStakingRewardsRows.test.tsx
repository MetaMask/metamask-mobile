import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import TronStakingRewardsRows from './TronStakingRewardsRows';
import { strings } from '../../../../../../../locales/i18n';
import { TronStakingRewardsRowsTestIds } from './TronStakingRewardsRows.testIds';
import type { TokenI } from '../../../../Tokens/types';

const mockUseTronStakingRewardsSummary = jest.fn();

jest.mock('./useTronStakingRewardsSummary', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseTronStakingRewardsSummary(...args),
}));

jest.mock('../../../../../../selectors/preferencesController', () => ({
  selectPrivacyMode: jest.fn(() => false),
}));

const mockStore = configureMockStore();

const trxToken = {
  address: 'tron:728126428/slip44:195',
  chainId: 'tron:728126428',
  symbol: 'TRX',
  ticker: 'TRX',
} as TokenI;

describe('TronStakingRewardsRows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTronStakingRewardsSummary.mockReturnValue({
      totalSubtitle: '$10.00 · 1 TRX',
      estimatedSubtitle: '$5.00 · 0.500 TRX',
      showEstimatedSkeleton: false,
    });
  });

  const renderWithStore = (ui: React.ReactElement) =>
    render(<Provider store={mockStore({})}>{ui}</Provider>);

  it('renders both row titles', () => {
    const { getByText } = renderWithStore(
      <TronStakingRewardsRows
        token={trxToken}
        apyDecimal="2.45"
        isApyLoading={false}
      />,
    );

    expect(getByText(strings('stake.tron.total_rewards'))).toBeTruthy();
    expect(getByText(strings('stake.estimated_annual_rewards'))).toBeTruthy();
  });

  it('renders container and row testIDs', () => {
    const { getByTestId } = renderWithStore(
      <TronStakingRewardsRows
        token={trxToken}
        apyDecimal="2.45"
        isApyLoading={false}
      />,
    );

    expect(getByTestId(TronStakingRewardsRowsTestIds.CONTAINER)).toBeTruthy();
    expect(
      getByTestId(TronStakingRewardsRowsTestIds.TOTAL_REWARDS_ROW),
    ).toBeTruthy();
    expect(
      getByTestId(TronStakingRewardsRowsTestIds.ESTIMATED_ANNUAL_ROW),
    ).toBeTruthy();
  });

  it('shows skeleton for estimated subtitle when hook requests it', () => {
    mockUseTronStakingRewardsSummary.mockReturnValue({
      totalSubtitle: '$0.00 · 0 TRX',
      estimatedSubtitle: null,
      showEstimatedSkeleton: true,
    });

    const { getByTestId, queryByTestId } = renderWithStore(
      <TronStakingRewardsRows
        token={trxToken}
        apyDecimal={null}
        isApyLoading
      />,
    );

    expect(
      getByTestId(TronStakingRewardsRowsTestIds.TOTAL_SUBTITLE),
    ).toBeTruthy();
    expect(
      queryByTestId(TronStakingRewardsRowsTestIds.ESTIMATED_SUBTITLE),
    ).toBeNull();
  });

  it('passes token and APY props to summary hook', () => {
    renderWithStore(
      <TronStakingRewardsRows
        token={trxToken}
        apyDecimal="3"
        isApyLoading={false}
      />,
    );

    expect(mockUseTronStakingRewardsSummary).toHaveBeenCalledWith({
      token: trxToken,
      apyDecimal: '3',
      isApyLoading: false,
    });
  });
});
