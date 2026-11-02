import { IconName } from '@metamask/design-system-react-native';
import type { NeoBankMicrodeposit } from '@metamask/ramps-controller';
import {
  getMicrodepositId,
  mapMicrodeposits,
  microdepositDisplayInfo,
} from './microdeposits';

const deposit = (
  overrides: Partial<NeoBankMicrodeposit> = {},
): NeoBankMicrodeposit => ({
  amount: '0.34',
  currency_code: 'USD',
  created_at: '2026-10-26T15:04:05.000Z',
  counterparty_name: 'CHASE',
  ...overrides,
});

describe('microdeposits', () => {
  describe('mapMicrodeposits', () => {
    it('maps MoonPay fields and sorts newest first', () => {
      const rows = mapMicrodeposits([
        deposit({ created_at: '2026-10-20T00:00:00.000Z', amount: '0.11' }),
        deposit({ created_at: '2026-10-27T00:00:00.000Z', amount: '0.34' }),
      ]);

      expect(rows.map((row) => row.amount)).toEqual(['0.34', '0.11']);
      expect(rows[0]).toEqual({
        id: getMicrodepositId(
          deposit({ created_at: '2026-10-27T00:00:00.000Z', amount: '0.34' }),
          Date.parse('2026-10-27T00:00:00.000Z'),
        ),
        amount: '0.34',
        currencyCode: 'USD',
        counterpartyName: 'CHASE',
        time: Date.parse('2026-10-27T00:00:00.000Z'),
      });
    });

    it('dedupes rows identical in every identity field', () => {
      const rows = mapMicrodeposits([deposit(), deposit()]);

      expect(rows).toHaveLength(1);
    });

    it('keeps repeat rounds that differ only by timestamp', () => {
      const rows = mapMicrodeposits([
        deposit({ created_at: '2026-10-20T00:00:00.000Z' }),
        deposit({ created_at: '2026-10-27T00:00:00.000Z' }),
      ]);

      expect(rows).toHaveLength(2);
    });

    it('drops entries without a parseable created_at', () => {
      const rows = mapMicrodeposits([
        deposit({ created_at: 'not-a-date' }),
        deposit(),
      ]);

      expect(rows).toHaveLength(1);
    });

    it('keeps a missing counterparty name', () => {
      const rows = mapMicrodeposits([
        deposit({ counterparty_name: undefined }),
      ]);

      expect(rows[0].counterpartyName).toBeUndefined();
    });
  });

  describe('microdepositDisplayInfo', () => {
    it('labels the row as a test deposit with the amount and currency', () => {
      const [row] = mapMicrodeposits([deposit()]);

      const display = microdepositDisplayInfo(row);

      expect(display.label).toBe('Test Deposit');
      expect(display.description).toBe('From CHASE');
      expect(display.primaryAmount).toBe('+0.34 USD');
      expect(display.isIncoming).toBe(true);
      expect(display.icon).toBe(IconName.Bank);
      expect(display.status).toBe('confirmed');
      expect(display.showPrimaryAmount).toBe(true);
    });

    it('falls back to the generic bank description without a counterparty', () => {
      const [row] = mapMicrodeposits([
        deposit({ counterparty_name: undefined }),
      ]);

      expect(microdepositDisplayInfo(row).description).toBe('From your bank');
    });

    it('hides a non-positive or malformed amount', () => {
      const [zero] = mapMicrodeposits([deposit({ amount: '0' })]);
      const [garbage] = mapMicrodeposits([deposit({ amount: 'nope' })]);

      expect(microdepositDisplayInfo(zero).showPrimaryAmount).toBe(false);
      expect(microdepositDisplayInfo(zero).primaryAmount).toBe('');
      expect(microdepositDisplayInfo(garbage).showPrimaryAmount).toBe(false);
    });
  });
});
