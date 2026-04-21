import { renderHook, act } from '@testing-library/react-native';
import {
  useNotificationPreferences,
  TX_AMOUNT_THRESHOLDS,
} from './useNotificationPreferences';

const makeTrader = (id: string) => ({ id });

const FOLLOWED_TRADERS = [
  makeTrader('trader-1'),
  makeTrader('trader-2'),
  makeTrader('trader-3'),
];

describe('useNotificationPreferences', () => {
  describe('initial state', () => {
    it('initializes enabled to true', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      expect(result.current.preferences.enabled).toBe(true);
    });

    it('initializes txAmountLimit to 500', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      expect(result.current.preferences.txAmountLimit).toBe(500);
    });

    it('initializes traderProfileIds with every followed trader opted in', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      expect(result.current.preferences.traderProfileIds).toEqual([
        'trader-1',
        'trader-2',
        'trader-3',
      ]);
      FOLLOWED_TRADERS.forEach(({ id }) => {
        expect(result.current.isTraderNotificationEnabled(id)).toBe(true);
      });
    });

    it('initializes with empty traderProfileIds when given no traders', () => {
      const { result } = renderHook(() => useNotificationPreferences([]));

      expect(result.current.preferences.traderProfileIds).toEqual([]);
    });
  });

  describe('setEnabled', () => {
    it('sets enabled to false when called with false', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      act(() => {
        result.current.setEnabled(false);
      });

      expect(result.current.preferences.enabled).toBe(false);
    });

    it('sets enabled back to true after being disabled', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      act(() => {
        result.current.setEnabled(false);
      });
      act(() => {
        result.current.setEnabled(true);
      });

      expect(result.current.preferences.enabled).toBe(true);
    });
  });

  describe('setTxAmountLimit', () => {
    it.each(TX_AMOUNT_THRESHOLDS)(
      'updates txAmountLimit to %s when called',
      (threshold) => {
        const { result } = renderHook(() =>
          useNotificationPreferences(FOLLOWED_TRADERS),
        );

        act(() => {
          result.current.setTxAmountLimit(threshold);
        });

        expect(result.current.preferences.txAmountLimit).toBe(threshold);
      },
    );
  });

  describe('toggleTraderNotification', () => {
    it('removes the trader id from traderProfileIds when toggled off', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      act(() => {
        result.current.toggleTraderNotification('trader-1');
      });

      expect(result.current.preferences.traderProfileIds).not.toContain(
        'trader-1',
      );
      expect(result.current.isTraderNotificationEnabled('trader-1')).toBe(
        false,
      );
    });

    it('re-adds the trader id on a second call', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      act(() => {
        result.current.toggleTraderNotification('trader-1');
      });
      act(() => {
        result.current.toggleTraderNotification('trader-1');
      });

      expect(result.current.preferences.traderProfileIds).toContain('trader-1');
      expect(result.current.isTraderNotificationEnabled('trader-1')).toBe(true);
    });

    it('does not affect other trader opt-ins', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      act(() => {
        result.current.toggleTraderNotification('trader-1');
      });

      expect(result.current.isTraderNotificationEnabled('trader-2')).toBe(true);
      expect(result.current.isTraderNotificationEnabled('trader-3')).toBe(true);
    });
  });

  describe('followed traders list changes', () => {
    it('appends newly-followed trader ids as opted-in', () => {
      const initial = [makeTrader('trader-1')];
      const { result, rerender } = renderHook(
        ({ traders }: { traders: { id: string }[] }) =>
          useNotificationPreferences(traders),
        { initialProps: { traders: initial } },
      );

      rerender({ traders: [...initial, makeTrader('trader-2')] });

      expect(result.current.preferences.traderProfileIds).toContain('trader-2');
      expect(result.current.isTraderNotificationEnabled('trader-2')).toBe(true);
    });

    it('preserves explicit opt-outs when the list grows', () => {
      const initial = [makeTrader('trader-1')];
      const { result, rerender } = renderHook(
        ({ traders }: { traders: { id: string }[] }) =>
          useNotificationPreferences(traders),
        { initialProps: { traders: initial } },
      );

      act(() => {
        result.current.toggleTraderNotification('trader-1');
      });

      rerender({ traders: [...initial, makeTrader('trader-2')] });

      expect(result.current.isTraderNotificationEnabled('trader-1')).toBe(
        false,
      );
    });

    it('does not change state reference when the same list is passed again', () => {
      const { result, rerender } = renderHook(
        ({ traders }: { traders: { id: string }[] }) =>
          useNotificationPreferences(traders),
        { initialProps: { traders: FOLLOWED_TRADERS } },
      );

      const before = result.current.preferences.traderProfileIds;

      rerender({ traders: FOLLOWED_TRADERS });

      expect(result.current.preferences.traderProfileIds).toBe(before);
    });
  });
});
