import { INotification } from '../types';
import onChainAnalyticProperties, {
  notificationAnalyticsProperties,
} from './notification-analytics';

describe('onChainAnalyticProperties', () => {
  it('returns undefined if notification is not on-chain', () => {
    const notification = {
      notification_type: 'off-chain',
    } as unknown as INotification;
    expect(onChainAnalyticProperties(notification)).toBeUndefined();
  });

  it('returns undefined if notification is on-chain but has no chain_id', () => {
    const notification = {
      notification_type: 'wallet_activity',
      payload: {},
    } as unknown as INotification;
    expect(onChainAnalyticProperties(notification)).toBeUndefined();
  });

  it('returns chain_id if notification is on-chain and has chain_id', () => {
    const notification = {
      notification_type: 'wallet_activity',
      payload: {
        chain_id: '1',
      },
    } as unknown as INotification;
    expect(onChainAnalyticProperties(notification)).toStrictEqual({
      chain_id: '1',
    });
  });

  it('returns undefined if item is not a notification', () => {
    const notification = {} as unknown as INotification;
    expect(onChainAnalyticProperties(notification)).toBeUndefined();
  });
});

describe('notificationAnalyticsProperties', () => {
  it('builds the shared id, type and subtype properties', () => {
    const notification = {
      id: 'notification-1',
      type: 'eth_received',
    } as unknown as INotification;

    expect(notificationAnalyticsProperties(notification)).toStrictEqual({
      notification_id: 'notification-1',
      notification_type: 'eth_received',
      notification_subtype: 'eth_received',
    });
  });

  it('derives the subtype and merges chain_id for on-chain notifications', () => {
    const notification = {
      id: 'notification-1',
      type: 'eth_received',
      notification_type: 'wallet_activity',
      payload: { chain_id: '1', data: { kind: 'eth_received' } },
    } as unknown as INotification;

    expect(notificationAnalyticsProperties(notification)).toStrictEqual({
      notification_id: 'notification-1',
      notification_type: 'wallet_activity',
      notification_subtype: 'eth_received',
      chain_id: '1',
    });
  });
});
