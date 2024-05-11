import {
  formatDate,
  formatNotificationTitle,
  getNotificationBadge,
  sortNotifications,
} from '.';
import { TRIGGER_TYPES } from '../../../util/notifications';
import { IconName } from '../../../component-library/components/Icons/Icon';

interface Notification {
  id: string;
  createdAt: Date;
}

describe('formatDate', () => {
  const realDateNow = Date.now.bind(global.Date);

  beforeEach(() => {
    global.Date.now = jest.fn(() => new Date('2024-05-10T12:00:00Z').getTime());
  });

  afterEach(() => {
    global.Date.now = realDateNow;
  });

  it('returns "Yesterday" if the date is from yesterday', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60);
    expect(formatDate(yesterday)).toBe('Yesterday');
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

  test('returns default icon for unknown trigger types', () => {
    expect(getNotificationBadge('UNKNOWN_TRIGGER')).toBe(IconName.Sparkle);
  });
});

describe('sortNotifications', () => {
  test('sorts notifications by createdAt in descending order', () => {
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

  test('handles empty array without error', () => {
    expect(sortNotifications([])).toEqual([]);
  });

  test('handles array with single element', () => {
    const singleNotification: Notification[] = [
      { id: '1', createdAt: new Date('2023-01-01') },
    ];
    expect(sortNotifications(singleNotification)).toEqual(singleNotification);
  });

  test('is stable for notifications with the same createdAt', () => {
    const notifications: Notification[] = [
      { id: '1', createdAt: new Date('2023-01-01') },
      { id: '2', createdAt: new Date('2023-01-01') },
      { id: '3', createdAt: new Date('2023-01-01') },
    ];
    const sortedNotifications = sortNotifications(notifications);
    expect(sortedNotifications).toEqual(notifications);
  });
});
