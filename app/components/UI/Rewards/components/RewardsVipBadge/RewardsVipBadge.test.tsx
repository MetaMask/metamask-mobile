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
    return key;
  }),
}));

describe('RewardsVipBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders vip badge when tier is 1', () => {
    mockUseVipTier.mockReturnValue(1);
    const { getByTestId } = render(<RewardsVipBadge />);

    expect(getByTestId('rewards-vip-badge')).toHaveTextContent('Mock VIP 1');
  });

  it('renders nothing if vip tier is null', () => {
    mockUseVipTier.mockReturnValue(null);
    const { queryByTestId } = render(<RewardsVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });

  it('renders nothing if vip tier is 0', () => {
    mockUseVipTier.mockReturnValue(0);
    const { queryByTestId } = render(<RewardsVipBadge />);

    expect(queryByTestId('rewards-vip-badge')).toBeNull();
  });
});
