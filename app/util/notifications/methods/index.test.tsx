import {
  formatDate,
  formatNotificationTitle,
  getNotificationBadge,
  sortNotifications,
  getRowDetails,
  NotificationRowProps,
} from '.';
import { TRIGGER_TYPES, Notification } from '../../../util/notifications';
import { IconName } from '../../../component-library/components/Icons/Icon';

const NOTIFICATIONS = [
  {
    id: '1',
    createdAt: new Date('2023-01-01'),
    isRead: false,
    type: TRIGGER_TYPES.ETH_SENT,
    data: {
      kind: 'eth_sent',
      network_fee: {
        gas_price: '0.003',
        native_token_price_in_usd: '3.700',
      },
      from: '0xABC123',
      to: '0xDEF456',
      amount: { usd: '0.000', eth: '1.5' },
    },
  } as Notification,
  {
    id: '2',
    createdAt: new Date('2023-01-01'),
    isRead: false,
    type: TRIGGER_TYPES.ETH_SENT,
    data: {
      kind: 'eth_sent',
      network_fee: {
        gas_price: '0.003',
        native_token_price_in_usd: '3.700',
      },
      from: '0xABC123',
      to: '0xDEF456',
      amount: { usd: '0.000', eth: '1.5' },
    },
  } as Notification,
  {
    id: '3',
    createdAt: new Date('2023-01-01'),
    isRead: false,
    type: TRIGGER_TYPES.ETH_SENT,
    data: {
      kind: 'eth_sent',
      network_fee: {
        gas_price: '0.003',
        native_token_price_in_usd: '3.700',
      },
      from: '0xABC123',
      to: '0xDEF456',
      amount: { usd: '0.000', eth: '1.5' },
    },
  } as Notification,
];
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
      { id: '1', createdAt: new Date('2023-01-01') },
      { id: '3', createdAt: new Date('2023-01-03') },
      { id: '2', createdAt: new Date('2023-01-02') },
    ];
    const sortedNotifications = sortNotifications(notifications);
    expect(sortedNotifications).toEqual([
      { id: '3', createdAt: new Date('2023-01-03') },
      { id: '2', createdAt: new Date('2023-01-02') },
      { id: '1', createdAt: new Date('2023-01-01') },
    ]);
  });

  it('handles empty array without error', () => {
    expect(sortNotifications([])).toEqual([]);
  });

  it('handles array with single element', () => {
    const singleNotification: Notification[] = [
      { id: '1', createdAt: new Date('2023-01-01') },
    ];
    expect(sortNotifications(singleNotification)).toEqual(singleNotification);
  });

  it('is stable for notifications with the same createdAt', () => {
    const notifications: Notification[] = NOTIFICATIONS;
    const sortedNotifications = sortNotifications(notifications);
    expect(sortedNotifications).toEqual(notifications);
  });
});

describe('getRowDetails', () => {
  it('handles LIDO_STAKE_COMPLETED notification', () => {
    const notification: Notification = {
      type: TRIGGER_TYPES.LIDO_STAKE_COMPLETED,
      createdAt: new Date('2023-01-01'),
      data: {
        stake_out: {
          symbol: 'ETH',
          name: 'Ethereum',
          image: 'image_url',
          amount: '1000000',
        },
      },
    } as Notification;

    const expected: NotificationRowProps = {
      row: {
        badgeIcon: 'Plant',
        title: 'Stake completed',
        description: {
          asset: {
            symbol: 'ETH',
            name: 'Ethereum',
          },
        },
        createdAt: 'Dec 31',
        imageUrl: 'image_url',
        value: '< 0.00001 ETH',
      },
      details: {},
    };

    expect(getRowDetails(notification)).toEqual(expected);
  });

  it('handles METAMASK_SWAP_COMPLETED notification', () => {
    const notification: Notification = {
      type: TRIGGER_TYPES.METAMASK_SWAP_COMPLETED,
      createdAt: new Date('2023-01-01'),
      data: {
        token_in: {
          symbol: 'BTC',
          image: 'btc_image_url',
        },
        token_out: {
          symbol: 'ETH',
          name: 'Ethereum',
          image: 'eth_image_url',
          amount: '500000',
        },
      },
    } as Notification;

    const expected: NotificationRowProps = {
      row: {
        badgeIcon: 'SwapHorizontal',
        title: 'Swapped BTC for ETH',
        description: {
          asset: {
            symbol: 'ETH',
            name: 'Ethereum',
          },
        },
        createdAt: 'Dec 31',
        imageUrl: 'eth_image_url',
        value: '< 0.00001 ETH',
      },
      details: {},
    };

    expect(getRowDetails(notification)).toEqual(expected);
  });

  it('handles ETH_SENT notification', () => {
    const notification: Notification = {
      type: TRIGGER_TYPES.ETH_SENT,
      createdAt: new Date('2023-01-01'),
      data: {
        to: '0xABC123',
        amount: {
          eth: '1.5',
        },
      },
    } as Notification;

    const expected: NotificationRowProps = {
      row: {
        badgeIcon: 'Arrow2Upright',
        title: 'Sent to 0xABC123',
        description: {
          asset: {
            symbol: 'ETH',
            name: 'Ethereum',
          },
        },
        createdAt: 'Dec 31',
        value: '1.5 ETH',
      },
      details: {},
    };

    expect(getRowDetails(notification)).toEqual(expected);
  });

  it('handles ERC721_RECEIVED notification', () => {
    const notification: Notification = {
      type: TRIGGER_TYPES.ERC721_RECEIVED,
      createdAt: new Date('2023-01-01'),
      data: {
        from: '0xDEF456',
        nft: {
          token_id: '1234',
          collection: {
            symbol: 'ART',
            name: 'ArtCollection',
          },
          image: 'nft_image_url',
        },
      },
    } as Notification;

    const expected: NotificationRowProps = {
      row: {
        badgeIcon: 'Received',
        title: 'Received NFT from 0xDEF456',
        description: {
          asset: {
            symbol: 'ART',
            name: 'ArtCollection',
          },
        },
        createdAt: 'Dec 31',
        imageUrl: 'nft_image_url',
        value: '#1234',
      },
      details: {},
    };

    expect(getRowDetails(notification)).toEqual(expected);
  });
});
