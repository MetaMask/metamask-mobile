import { INotification } from '../types';
import onChainAnalyticProperties from './notification-analytics';

describe('onChainAnalyticProperties', () => {
  it('returns undefined if notification is not on-chain', () => {
    const notification = {
      notification_type: 'off-chain',
    } as unknown as INotification;
    expect(onChainAnalyticProperties(notification)).toBeUndefined();
  });

  it('returns undefined if notification is on-chain but has no chain_id', () => {
    const notification = {
      notification_type: 'on-chain',
      payload: {},
    } as unknown as INotification;
    expect(onChainAnalyticProperties(notification)).toBeUndefined();
  });

  it('returns chain_id if notification is on-chain and has chain_id', () => {
    const notification = {
      notification_type: 'on-chain',
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
