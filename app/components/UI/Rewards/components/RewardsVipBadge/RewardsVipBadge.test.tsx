import React from 'react';
import { render } from '@testing-library/react-native';
import RewardsVipBadge from './RewardsVipBadge';

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

const mockUseIsProSubscriber = jest.fn();
jest.mock('../../../../../hooks/useIsProSubscriber', () => ({
  useIsProSubscriber: () => mockUseIsProSubscriber(),
}));

const mockUseProSubscriptionEnabled = jest.fn();
jest.mock('../../../../../hooks/useProSubscriptionEnabled', () => ({
  useProSubscriptionEnabled: () => mockUseProSubscriptionEnabled(),
}));

describe('RewardsVipBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsProSubscriber.mockReturnValue(false);
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
    });
  });

  it('renders vip badge when tier is 1', () => {
    mockUseVipTier.mockReturnValue(1);

    const { getByTestId } = render(<RewardsVipBadge />);

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 1');
  });

  it('renders vip badge instead of member badge when vip, pro enabled, and subscriber are all set', () => {
    mockUseVipTier.mockReturnValue(2);
    mockUseIsProSubscriber.mockReturnValue(true);
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });

    const { getByTestId, queryByTestId } = render(<RewardsVipBadge />);

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 2');
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders member badge when pro is enabled, the user is a subscriber, and vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);
    mockUseIsProSubscriber.mockReturnValue(true);
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });

    const { getByTestId, queryByTestId } = render(<RewardsVipBadge />);

    expect(getByTestId('rewards-member-badge')).toHaveTextContent('Member');
    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });

  it('renders nothing when the user is a subscriber but the pro subscription flag is disabled', () => {
    mockUseVipTier.mockReturnValue(null);
    mockUseIsProSubscriber.mockReturnValue(true);
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: false,
    });

    const { queryByTestId } = render(<RewardsVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders nothing when pro is enabled but the user is not a subscriber', () => {
    mockUseVipTier.mockReturnValue(null);
    mockUseIsProSubscriber.mockReturnValue(false);
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
    });

    const { queryByTestId } = render(<RewardsVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
    expect(queryByTestId('rewards-member-badge')).toBeNull();
  });

  it('renders nothing when vip tier is null and the user is not a pro subscriber', () => {
    mockUseVipTier.mockReturnValue(null);

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
