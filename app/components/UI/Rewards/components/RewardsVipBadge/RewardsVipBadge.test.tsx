import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsVipBadge from './RewardsVipBadge';
import { MoneyAccountPlusAccess } from '../../../../../hooks/useMoneyAccountPlusAccess';

const mockUseVipTier = jest.fn();
jest.mock('../../hooks/useVipTier', () => ({
  useVipTier: () => mockUseVipTier(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string, params?: Record<string, unknown>) => {
    if (key === 'rewards.vip.badge_label' && params) {
      return `Mock VIP ${params.tier}`;
    }
    if (key === 'rewards.pro_member_badge_label') {
      return 'Member';
    }
    return key;
  }),
}));

const mockUseMoneyAccountPlusAccess = jest.fn();
jest.mock('../../../../../hooks/useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('../../../../../hooks/useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: () => mockUseMoneyAccountPlusAccess(),
}));

describe('RewardsVipBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Disabled,
    );
  });

  it('renders vip badge when tier is 1', () => {
    mockUseVipTier.mockReturnValue(1);

    const { getByTestId } = render(<RewardsVipBadge />);

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 1');
  });

  it('renders vip badge instead of member badge when the user is both vip and a pro subscriber', () => {
    mockUseVipTier.mockReturnValue(2);
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );

    const { getByTestId, queryByTestId } = render(<RewardsVipBadge />);

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 2');
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders member badge when the user is a pro subscriber and vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Subscriber,
    );

    const { getByTestId, queryByTestId } = render(<RewardsVipBadge />);

    expect(getByTestId('rewards-member-badge')).toHaveTextContent('Member');
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });

  it.each([
    MoneyAccountPlusAccess.Disabled,
    MoneyAccountPlusAccess.Eligible,
    MoneyAccountPlusAccess.Unknown,
  ])('renders nothing when vip tier is null and pro access is %s', (access) => {
    mockUseVipTier.mockReturnValue(null);
    mockUseMoneyAccountPlusAccess.mockReturnValue(access);

    const { queryByTestId } = render(<RewardsVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders nothing when vip tier is 0 and the user is not a pro subscriber', () => {
    mockUseVipTier.mockReturnValue(0);

    const { queryByTestId } = render(<RewardsVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });
});
