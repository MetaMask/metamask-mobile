import {
  isNeobankPendingStatus,
  isNeobankVisibleActivityStatus,
  mapAutorampTransactionToNeobankActivity,
  neobankActivityDisplayInfo,
} from './neobankActivity';

describe('neobankActivity', () => {
  describe('isNeobankPendingStatus', () => {
    it('treats non-terminal statuses as pending', () => {
      expect(isNeobankPendingStatus('Pending')).toBe(true);
      expect(isNeobankPendingStatus('Processing')).toBe(true);
      expect(isNeobankPendingStatus('Completed')).toBe(false);
      expect(isNeobankPendingStatus('Failed')).toBe(false);
      expect(isNeobankPendingStatus('Cancelled')).toBe(false);
      expect(isNeobankVisibleActivityStatus('Completed')).toBe(false);
      expect(isNeobankVisibleActivityStatus('Pending')).toBe(true);
      expect(isNeobankVisibleActivityStatus('Failed')).toBe(true);
    });
  });

  describe('mapAutorampTransactionToNeobankActivity', () => {
    it('maps amounts, status, and createdAt', () => {
      const mapped = mapAutorampTransactionToNeobankActivity({
        id: 'tx-1',
        autorampId: 'ar-1',
        status: 'Pending',
        sourceAmount: '75.23',
        destinationAmount: '15',
        createdAt: '2026-10-14T00:12:31.127Z',
      });

      expect(mapped).toMatchObject({
        id: 'tx-1',
        autorampId: 'ar-1',
        status: 'Pending',
        sourceAmount: '75.23',
        destinationAmount: '15',
        time: Date.parse('2026-10-14T00:12:31.127Z'),
      });
    });
  });

  describe('neobankActivityDisplayInfo', () => {
    it('labels pending deposits as Adding funds with pending status', () => {
      const display = neobankActivityDisplayInfo(
        mapAutorampTransactionToNeobankActivity({
          id: 'p1',
          autorampId: 'ar-1',
          status: 'Pending',
          destinationAmount: '15',
          createdAt: '2026-10-14T00:12:00.000Z',
        }),
      );

      expect(display.label).toBe('Adding funds');
      expect(display.description).toBe('Bank transfer');
      expect(display.status).toBe('pending');
      expect(display.isIncoming).toBe(true);
      expect(display.fiatAmount).toBe('+$15.00');
      expect(display.showPrimaryAmount).toBeUndefined();
      expect(display.pendingStatusLabel).toBeUndefined();
      expect(display.isPrimaryAmountPending).toBeUndefined();
      expect(display.isFiatAmountMuted).toBeUndefined();
    });

    it('shows the amount while MoonPay is completed but Money settlement is pending', () => {
      const display = neobankActivityDisplayInfo(
        mapAutorampTransactionToNeobankActivity({
          id: 'c1',
          autorampId: 'ar-1',
          status: 'Completed',
          destinationAmount: '15',
          createdAt: '2026-10-14T00:12:00.000Z',
        }),
      );

      expect(display.label).toBe('Adding funds');
      expect(display.status).toBe('pending');
      expect(display.isIncoming).toBe(true);
      expect(display.fiatAmount).toBe('+$15.00');
      expect(display.showPrimaryAmount).toBeUndefined();
    });

    it('shows a failed deposit as a signed zero dollar amount', () => {
      const display = neobankActivityDisplayInfo(
        mapAutorampTransactionToNeobankActivity({
          id: 'f1',
          autorampId: 'ar-1',
          status: 'Failed',
          destinationAmount: '15',
          createdAt: '2026-10-14T00:12:00.000Z',
        }),
      );

      expect(display.label).toBe('Failed to add funds');
      expect(display.status).toBe('failed');
      expect(display.isIncoming).toBe(true);
      expect(display.fiatAmount).toBe('+$0.00');
      expect(display.showPrimaryAmount).toBeUndefined();
    });
  });
});
