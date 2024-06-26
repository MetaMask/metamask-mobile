import {
  formatDate,
  formatNotificationTitle,
  getNotificationBadge,
  sortNotifications,
  returnAvatarProps,
  getRowDetails,
  getNetwork,
  TxStatus,
} from '.';
import { TRIGGER_TYPES, Notification } from '../../../util/notifications';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import { mockTheme } from '../../../util/theme';
import { ETHEREUM_LOGO } from '../../../constants/urls';
import {
  createMockNotificationERC721Received,
  createMockNotificationEthSent,
  createMockNotificationLidoStakeCompleted,
  createMockNotificationMetaMaskSwapsCompleted,
} from 'app/components/UI/Notification/__mocks__/mock_notifications';

function createMockNotification(override?: { id?: string; createdAt?: Date }) {
  const n = createMockNotificationEthSent();
  n.id = override?.id ?? n.id;
  n.createdAt = override?.createdAt?.toString() ?? n.createdAt;
  return n;
}

describe('formatDate', () => {
  const realDateNow = Date.now.bind(global.Date);

  beforeEach(() => {
    global.Date.now = jest.fn(() => new Date('2024-05-10T12:00:00Z').getTime());
  });

  afterEach(() => {
    global.Date.now = realDateNow;
  });

  it('returns formatted date as "May 8" if the date is earlier this year but not yesterday', () => {
    const earlierThisYear = new Date('2024-05-08T12:00:00Z');
    expect(formatDate(earlierThisYear)).toBe('May 8');
  });

  it('returns formatted date with year if the date is from a previous year', () => {
    const lastYear = new Date('2023-12-25T12:00:00Z');
    expect(formatDate(lastYear)).toBe('Dec 25');
  });

  it('removes the first word and returns the rest in lowercase', () => {
    const title = 'ERROR_Unexpected_Error_Occurred';
    expect(formatNotificationTitle(title)).toBe('unexpected_error_occurred');
  });

  it('returns an empty string if only one word is present', () => {
    const title = 'ERROR';
    expect(formatNotificationTitle(title)).toBe('');
  });

  it('returns an empty string if the original string is empty', () => {
    const title = '';
    expect(formatNotificationTitle(title)).toBe('');
  });

  it('handles strings with multiple leading underscores', () => {
    const title = '__Sending_ETH_';
    expect(formatNotificationTitle(title)).toBe('_sending_eth_');
  });

  it('processes case sensitivity by converting to lowercase', () => {
    const title = 'ETH_Received_Completed';
    expect(formatNotificationTitle(title)).toBe('received_completed');
  });
});

describe('getNotificationBadge', () => {
  test.each([
    [TRIGGER_TYPES.ERC20_SENT, IconName.Arrow2Upright],
    [TRIGGER_TYPES.ERC721_SENT, IconName.Arrow2Upright],
    [TRIGGER_TYPES.ERC1155_SENT, IconName.Arrow2Upright],
    [TRIGGER_TYPES.ETH_SENT, IconName.Arrow2Upright],
    [TRIGGER_TYPES.ERC20_RECEIVED, IconName.Received],
    [TRIGGER_TYPES.ERC721_RECEIVED, IconName.Received],
    [TRIGGER_TYPES.ERC1155_RECEIVED, IconName.Received],
    [TRIGGER_TYPES.ETH_RECEIVED, IconName.Received],
    [TRIGGER_TYPES.METAMASK_SWAP_COMPLETED, IconName.SwapHorizontal],
    [TRIGGER_TYPES.ROCKETPOOL_STAKE_COMPLETED, IconName.Plant],
    [TRIGGER_TYPES.ROCKETPOOL_UNSTAKE_COMPLETED, IconName.Plant],
    [TRIGGER_TYPES.LIDO_STAKE_COMPLETED, IconName.Plant],
    [TRIGGER_TYPES.LIDO_STAKE_READY_TO_BE_WITHDRAWN, IconName.Plant],
    [TRIGGER_TYPES.LIDO_WITHDRAWAL_REQUESTED, IconName.Plant],
    [TRIGGER_TYPES.LIDO_WITHDRAWAL_COMPLETED, IconName.Plant],
  ])('returns correct icon for %s', (triggerType, expectedIcon) => {
    expect(getNotificationBadge(triggerType)).toBe(expectedIcon);
  });

  it('returns default icon for unknown trigger types', () => {
    expect(getNotificationBadge('UNKNOWN_TRIGGER')).toBe(IconName.Sparkle);
  });
});

describe('sortNotifications', () => {
  it('sorts notifications by createdAt in descending order', () => {
    const notifications: Notification[] = [
      createMockNotification({ id: '1', createdAt: new Date('2023-01-01') }),
      createMockNotification({ id: '3', createdAt: new Date('2023-01-03') }),
      createMockNotification({ id: '2', createdAt: new Date('2023-01-02') }),
    ];
    const sortedNotifications = sortNotifications(notifications);
    expect(sortedNotifications).toEqual([
      expect.objectContaining({ id: '3', createdAt: new Date('2023-01-03') }),
      expect.objectContaining({ id: '2', createdAt: new Date('2023-01-02') }),
      expect.objectContaining({ id: '1', createdAt: new Date('2023-01-01') }),
    ]);
  });

  it('handles empty array without error', () => {
    expect(sortNotifications([])).toEqual([]);
  });

  it('handles array with single element', () => {
    const singleNotification: Notification[] = [
      createMockNotification({ id: '1', createdAt: new Date('2023-01-01') }),
    ];
    expect(sortNotifications(singleNotification)).toEqual(singleNotification);
  });

  it('is stable for notifications with the same createdAt', () => {
    const notifications: Notification[] = [
      createMockNotification({ id: '1', createdAt: new Date('2023-01-01') }),
      createMockNotification({ id: '3', createdAt: new Date('2023-01-01') }),
      createMockNotification({ id: '2', createdAt: new Date('2023-01-01') }),
    ];
    const sortedNotifications = sortNotifications(notifications);
    expect(sortedNotifications).toEqual(notifications);
  });
});

describe('getRowDetails', () => {
  it('handles LIDO_STAKE_COMPLETED notification', () => {
    const notification: Notification =
      createMockNotificationLidoStakeCompleted();

    const expectedRow = {
      badgeIcon: IconName.Plant,
      title: 'Stake completed',
      description: {
        asset: {
          symbol: 'ETH',
          name: 'Ethereum',
        },
      },
      createdAt: 'Dec 30',
      imageUrl: ETHEREUM_LOGO,
      value: '< 0.00001 ETH',
    };

    expect(getRowDetails(notification).row).toEqual(expectedRow);
  });

  it('handles METAMASK_SWAP_COMPLETED notification', () => {
    const notification: Notification =
      createMockNotificationMetaMaskSwapsCompleted();

    const expected = {
      badgeIcon: IconName.SwapHorizontal,
      title: 'Swapped BTC for ETH',
      description: {
        asset: {
          symbol: 'ETH',
          name: 'Ethereum',
        },
      },
      createdAt: 'Dec 31',
      imageUrl: ETHEREUM_LOGO,
      value: '< 0.00001 ETH',
    };

    expect(getRowDetails(notification).row).toEqual(expected);
  });

  it('handles ETH_SENT notification', () => {
    const notification: Notification = createMockNotificationEthSent();

    const expected = {
      badgeIcon: IconName.Arrow2Upright,
      title: 'Sent to 0xABC123',
      description: {
        asset: {
          symbol: 'ETH',
          name: 'Ethereum',
        },
      },
      createdAt: 'Dec 31',
      value: '1.5 ETH',
    };

    expect(getRowDetails(notification).row).toEqual(expected);
  });

  it('handles ERC721_RECEIVED notification', () => {
    const notification: Notification = createMockNotificationERC721Received();

    const expected = {
      badgeIcon: IconName.Received,
      title: 'Received NFT from 0xDEF456',
      description: {
        asset: {
          symbol: 'ART',
          name: 'ArtCollection',
        },
      },
      createdAt: 'Dec 31',
      imageUrl: ETHEREUM_LOGO,
      value: '#1234',
    };

    expect(getRowDetails(notification).row).toEqual(expected);
  });
});

describe('getNetwork', () => {
  it('should return the correct network for a valid chain_id', () => {
    const chainId = 1;
    const result = getNetwork(chainId);
    expect(result).toBe('ETHEREUM');
  });

  it('should return undefined for an invalid chain_id', () => {
    const chainId = 2;
    const result = getNetwork(chainId);
    expect(result).toBeUndefined();
  });
});

describe('returnAvatarProps', () => {
  it('should return correct props for CONFIRMED and APPROVED statuses', () => {
    const expectedProps = {
      name: IconName.Check,
      backgroundColor: mockTheme.colors.success.muted,
      iconColor: IconColor.Success,
    };
    expect(returnAvatarProps(TxStatus.CONFIRMED, mockTheme)).toEqual(
      expectedProps,
    );
    expect(returnAvatarProps(TxStatus.APPROVED, mockTheme)).toEqual(
      expectedProps,
    );
  });

  it('should return correct props for UNAPPROVED, CANCELLED, FAILED, and REJECTED statuses', () => {
    const expectedProps = {
      name: IconName.Close,
      backgroundColor: mockTheme.colors.error.muted,
      iconColor: IconColor.Error,
    };
    expect(returnAvatarProps(TxStatus.UNAPPROVED, mockTheme)).toEqual(
      expectedProps,
    );
    expect(returnAvatarProps(TxStatus.CANCELLED, mockTheme)).toEqual(
      expectedProps,
    );
    expect(returnAvatarProps(TxStatus.FAILED, mockTheme)).toEqual(
      expectedProps,
    );
    expect(returnAvatarProps(TxStatus.REJECTED, mockTheme)).toEqual(
      expectedProps,
    );
  });

  it('should return correct props for PENDING, SUBMITTED, and SIGNED statuses', () => {
    const expectedProps = {
      name: IconName.Clock,
      backgroundColor: mockTheme.colors.warning.muted,
      iconColor: IconColor.Warning,
    };
    expect(returnAvatarProps(TxStatus.PENDING, mockTheme)).toEqual(
      expectedProps,
    );
    expect(returnAvatarProps(TxStatus.SUBMITTED, mockTheme)).toEqual(
      expectedProps,
    );
    expect(returnAvatarProps(TxStatus.SIGNED, mockTheme)).toEqual(
      expectedProps,
    );
  });
});
