import { renderHook, act } from '@testing-library/react-native';
import {
  useNotificationPreferences,
  TX_AMOUNT_THRESHOLDS,
} from './useNotificationPreferences';
import type { TopTrader } from '../../../Homepage/Sections/TopTraders/types';

const makeTrader = (id: string): Pick<TopTrader, 'id'> => ({ id });

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

    it('initializes all followed traders with notifications enabled', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      FOLLOWED_TRADERS.forEach(({ id }) => {
        expect(result.current.preferences.traderNotifications[id]).toBe(true);
      });
    });

    it('initializes with an empty traderNotifications map when given no traders', () => {
      const { result } = renderHook(() => useNotificationPreferences([]));

      expect(result.current.preferences.traderNotifications).toEqual({});
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
    it('toggles a trader notification from true to false', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );
      const traderId = 'trader-1';

      act(() => {
        result.current.toggleTraderNotification(traderId);
      });

      expect(result.current.preferences.traderNotifications[traderId]).toBe(
        false,
      );
    });

    it('toggles a trader notification back to true on a second call', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );
      const traderId = 'trader-1';

      act(() => {
        result.current.toggleTraderNotification(traderId);
      });
      act(() => {
        result.current.toggleTraderNotification(traderId);
      });

      expect(result.current.preferences.traderNotifications[traderId]).toBe(
        true,
      );
    });

    it('does not affect other traders when one is toggled', () => {
      const { result } = renderHook(() =>
        useNotificationPreferences(FOLLOWED_TRADERS),
      );

      act(() => {
        result.current.toggleTraderNotification('trader-1');
      });

      expect(result.current.preferences.traderNotifications['trader-2']).toBe(
        true,
      );
      expect(result.current.preferences.traderNotifications['trader-3']).toBe(
        true,
      );
    });
  });

  describe('followed traders list changes', () => {
    it('adds new traders as notification-enabled when the list grows', () => {
      const initial = [makeTrader('trader-1')];
      const { result, rerender } = renderHook(
        ({ traders }: { traders: Pick<TopTrader, 'id'>[] }) =>
          useNotificationPreferences(traders),
        { initialProps: { traders: initial } },
      );

      rerender({ traders: [...initial, makeTrader('trader-2')] });

      expect(result.current.preferences.traderNotifications['trader-2']).toBe(
        true,
      );
    });

    it('preserves existing trader preferences when the list grows', () => {
      const initial = [makeTrader('trader-1')];
      const { result, rerender } = renderHook(
        ({ traders }: { traders: Pick<TopTrader, 'id'>[] }) =>
          useNotificationPreferences(traders),
        { initialProps: { traders: initial } },
      );

      act(() => {
        result.current.toggleTraderNotification('trader-1');
      });

      rerender({ traders: [...initial, makeTrader('trader-2')] });

      expect(result.current.preferences.traderNotifications['trader-1']).toBe(
        false,
      );
    });

    it('does not change state reference when the same list is passed again', () => {
      const { result, rerender } = renderHook(
        ({ traders }: { traders: Pick<TopTrader, 'id'>[] }) =>
          useNotificationPreferences(traders),
        { initialProps: { traders: FOLLOWED_TRADERS } },
      );

      const before = result.current.preferences.traderNotifications;

      rerender({ traders: FOLLOWED_TRADERS });

      expect(result.current.preferences.traderNotifications).toBe(before);
    });
  });
});
