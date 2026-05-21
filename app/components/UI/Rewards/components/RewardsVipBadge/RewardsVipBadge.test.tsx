import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import RewardsVipBadge from './RewardsVipBadge';
import { CaipAccountId } from '@metamask/utils';

const mockGetVipTierForAccount = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  context: {
    RewardsController: {
      getVipTierForAccount: (accountId: CaipAccountId) =>
        mockGetVipTierForAccount(accountId),
    },
  },
}));
describe('RewardsVipBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders vip badge', async () => {
    mockGetVipTierForAccount.mockResolvedValueOnce(1);
    const { getByTestId } = render(
      <RewardsVipBadge accountId={'eip155:1:0x1213'} />,
    );

    expect(mockGetVipTierForAccount).toHaveBeenCalledWith('eip155:1:0x1213');

    await waitFor(() => {
      expect(getByTestId('rewards-vip-badge')).toHaveTextContent('VIP 1');
    });
  });

  it('renders nothing if vip tier is not found', async () => {
    mockGetVipTierForAccount.mockResolvedValueOnce(null);
    const { queryByTestId } = render(
      <RewardsVipBadge accountId={'eip155:1:0x1213'} />,
    );

    expect(mockGetVipTierForAccount).toHaveBeenCalledWith('eip155:1:0x1213');

    await waitFor(() => {
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });
  });

  it('renders nothing if vip tier is 0', async () => {
    mockGetVipTierForAccount.mockResolvedValueOnce(0);
    const { queryByTestId } = render(
      <RewardsVipBadge accountId={'eip155:1:0x1213'} />,
    );

    expect(mockGetVipTierForAccount).toHaveBeenCalledWith('eip155:1:0x1213');

    await waitFor(() => {
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });
  });

  it('renders nothing if getting vip tier fails', async () => {
    mockGetVipTierForAccount.mockRejectedValueOnce(
      new Error('Failed to get vip tier'),
    );
    const { queryByTestId } = render(
      <RewardsVipBadge accountId={'eip155:1:0x1213'} />,
    );

    expect(mockGetVipTierForAccount).toHaveBeenCalledWith('eip155:1:0x1213');

    await waitFor(() => {
      expect(queryByTestId('rewards-vip-badge')).toBeNull();
    });
  });
});
