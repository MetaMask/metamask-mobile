import type { Hex } from '@metamask/utils';
import type { AccountsApiActivity } from '../types/moneyActivity';
import {
  filterNeobankActivityForMerge,
  findSettlingBankTransfer,
  isNeobankPendingStatus,
  mapAutorampTransactionToNeobankActivity,
  neobankActivityDisplayInfo,
} from './neobankActivity';

const bankTransfer = (
  hash: Hex,
  time: number,
): AccountsApiActivity => ({
  kind: 'bank_transfer',
  hash,
  time,
  chainId: '0x8f',
  token: {
    address: '0xmusd' as Hex,
    symbol: 'mUSD',
    decimals: 6,
  },
  amount: '15000000',
  receivedFrom: '0x798eee80db111278b9730609e91430ed3f85f801' as Hex,
});

describe('neobankActivity', () => {
  describe('isNeobankPendingStatus', () => {
    it('treats non-terminal statuses as pending', () => {
      expect(isNeobankPendingStatus('Pending')).toBe(true);
      expect(isNeobankPendingStatus('Processing')).toBe(true);
      expect(isNeobankPendingStatus('Completed')).toBe(false);
      expect(isNeobankPendingStatus('Failed')).toBe(false);
      expect(isNeobankPendingStatus('Cancelled')).toBe(false);
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

  describe('findSettlingBankTransfer', () => {
    it('does not time-match Pending NeoBank rows to nearby bank transfers', () => {
      const neobank = mapAutorampTransactionToNeobankActivity({
        id: 'pending-1',
        autorampId: 'ar-1',
        status: 'Pending',
        destinationAmount: '15',
        createdAt: '2026-10-14T01:00:00.000Z',
      });
      const api = [
        bankTransfer('0xabc' as Hex, Date.parse('2026-10-14T01:01:00.000Z')),
      ];

      expect(findSettlingBankTransfer(neobank, api)).toBeUndefined();
    });

    it('matches Completed NeoBank rows to a bank_transfer in the settlement window', () => {
      const neobank = mapAutorampTransactionToNeobankActivity({
        id: 'done-1',
        autorampId: 'ar-1',
        status: 'Completed',
        destinationAmount: '15',
        createdAt: '2026-10-14T00:12:00.000Z',
      });
      const credit = bankTransfer(
        '0xabc' as Hex,
        Date.parse('2026-10-14T00:13:00.000Z'),
      );

      expect(findSettlingBankTransfer(neobank, [credit])).toEqual(credit);
    });
  });

  describe('filterNeobankActivityForMerge', () => {
    it('keeps pending rows even when Accounts API has bank transfers', () => {
      const neobank = [
        mapAutorampTransactionToNeobankActivity({
          id: 'pending-1',
          autorampId: 'ar-1',
          status: 'Pending',
          destinationAmount: '15',
          createdAt: '2026-10-14T01:00:00.000Z',
        }),
      ];
      const api = [
        bankTransfer('0xabc' as Hex, Date.parse('2026-10-14T01:01:00.000Z')),
      ];

      expect(filterNeobankActivityForMerge(neobank, api)).toHaveLength(1);
    });

    it('drops completed neobank rows once an on-chain bank_transfer exists', () => {
      const neobank = [
        mapAutorampTransactionToNeobankActivity({
          id: 'done-1',
          autorampId: 'ar-1',
          status: 'Completed',
          destinationAmount: '15',
          createdAt: '2026-10-14T00:12:00.000Z',
        }),
      ];
      const api = [
        bankTransfer('0xabc' as Hex, Date.parse('2026-10-14T00:13:00.000Z')),
      ];

      expect(filterNeobankActivityForMerge(neobank, api)).toHaveLength(0);
    });

    it('drops neobank rows whose payout hash matches Accounts API', () => {
      const hash = '0xAbC123' as Hex;
      const neobank = [
        mapAutorampTransactionToNeobankActivity({
          id: 'done-2',
          autorampId: 'ar-1',
          status: 'Completed',
          destinationAmount: '15',
          createdAt: '2026-10-14T00:12:00.000Z',
          transactionHash: hash,
        }),
      ];
      const api = [
        bankTransfer('0xabc123' as Hex, Date.parse('2026-10-14T02:00:00.000Z')),
      ];

      expect(filterNeobankActivityForMerge(neobank, api)).toHaveLength(0);
    });
  });

  describe('neobankActivityDisplayInfo', () => {
    it('labels pending deposits as Depositing with pending status', () => {
      const display = neobankActivityDisplayInfo(
        mapAutorampTransactionToNeobankActivity({
          id: 'p1',
          autorampId: 'ar-1',
          status: 'Pending',
          destinationAmount: '15',
          createdAt: '2026-10-14T00:12:00.000Z',
        }),
      );

      expect(display.label).toBe('Depositing');
      expect(display.description).toBe('Bank transfer');
      expect(display.status).toBe('pending');
      expect(display.primaryAmount).toBe('');
      expect(display.fiatAmount).toBe('');
    });

    it('keeps MoonPay Completed deposits as Depositing with no amount until mUSD is on-chain', () => {
      const display = neobankActivityDisplayInfo(
        mapAutorampTransactionToNeobankActivity({
          id: 'c1',
          autorampId: 'ar-1',
          status: 'Completed',
          destinationAmount: '15',
          createdAt: '2026-10-14T00:12:00.000Z',
        }),
      );

      expect(display.label).toBe('Depositing');
      expect(display.status).toBe('pending');
      expect(display.primaryAmount).toBe('');
      expect(display.fiatAmount).toBe('');
    });
  });
});
