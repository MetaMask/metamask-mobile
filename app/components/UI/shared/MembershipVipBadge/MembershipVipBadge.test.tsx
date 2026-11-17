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

  it('renders the vip badge when the applied discount is vip and the tier is 1', () => {
    mockUseVipTier.mockReturnValue(1);

    const { getByTestId, queryByTestId } = render(
      <MembershipVipBadge discountKind="vip" />,
    );

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 1');
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders the member badge when the applied discount is member and a vip tier is set', () => {
    mockUseVipTier.mockReturnValue(2);

    const { getByTestId, queryByTestId } = render(
      <MembershipVipBadge discountKind="member" />,
    );

    expect(getByTestId('rewards-member-badge')).toHaveTextContent('Member');
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });

  it('renders the member badge when the applied discount is member and the vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);

    const { getByTestId, queryByTestId } = render(
      <MembershipVipBadge discountKind="member" />,
    );

    expect(getByTestId('rewards-member-badge')).toHaveTextContent('Member');
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });

  it('does not read the vip tier when the applied discount is member', () => {
    mockUseVipTier.mockReturnValue(2);

    render(<MembershipVipBadge discountKind="member" />);

    expect(mockUseVipTier).not.toHaveBeenCalled();
  });

  it('renders nothing when the applied discount is vip and the vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);

    const { queryByTestId } = render(<MembershipVipBadge discountKind="vip" />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders nothing when the applied discount is vip and the vip tier is 0', () => {
    mockUseVipTier.mockReturnValue(0);

    const { queryByTestId } = render(<MembershipVipBadge discountKind="vip" />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });
});
