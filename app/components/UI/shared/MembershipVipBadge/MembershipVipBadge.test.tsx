import React from 'react';
import { render } from '@testing-library/react-native';
import MembershipVipBadge from './MembershipVipBadge';

const mockUseVipTier = jest.fn();
jest.mock('../../Rewards/hooks/useVipTier', () => ({
  useVipTier: () => mockUseVipTier(),
}));

jest.mock('../../../../../locales/i18n', () => ({
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

describe('MembershipVipBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders vip badge when tier is 1', () => {
    mockUseVipTier.mockReturnValue(1);

    const { getByTestId } = render(<MembershipVipBadge />);

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 1');
  });

  it('renders vip badge instead of member badge when vip tier is set and hasProEntitlement is true', () => {
    mockUseVipTier.mockReturnValue(2);

    const { getByTestId, queryByTestId } = render(
      <MembershipVipBadge hasProEntitlement />,
    );

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 2');
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders member badge when hasProEntitlement is true and vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);

    const { getByTestId, queryByTestId } = render(
      <MembershipVipBadge hasProEntitlement />,
    );

    expect(getByTestId('rewards-member-badge')).toHaveTextContent('Member');
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });

  it('renders nothing when hasProEntitlement is omitted and vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);

    const { queryByTestId } = render(<MembershipVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders nothing when hasProEntitlement is false and vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);

    const { queryByTestId } = render(
      <MembershipVipBadge hasProEntitlement={false} />,
    );

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders nothing when vip tier is 0 and hasProEntitlement is omitted', () => {
    mockUseVipTier.mockReturnValue(0);

    const { queryByTestId } = render(<MembershipVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });
});
