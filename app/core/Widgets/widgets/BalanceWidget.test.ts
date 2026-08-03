import { createWidget } from 'expo-widgets';

// Extensionless import: Jest's haste config (via `@react-native/jest-preset`)
// defaults to resolving platform files as `ios`, matching how production
// code (WidgetUpdaterService.ts) imports this module. See
// BalanceWidget.android.ts for the Android counterpart, which is trivial
// enough (a no-op) not to need its own test.
import { BALANCE_WIDGET_NAME, BalanceWidget } from './BalanceWidget';

describe('BalanceWidget', () => {
  it('registers under the name expected by ios/ExpoWidgetsTarget/BalanceWidget.swift', () => {
    expect(BALANCE_WIDGET_NAME).toBe('BalanceWidget');
  });

  it('is created via expo-widgets createWidget exactly once at module load', () => {
    expect(createWidget).toHaveBeenCalledWith(
      BALANCE_WIDGET_NAME,
      expect.any(String),
    );
  });

  it('exposes an updateSnapshot method WidgetUpdaterService can push props through', () => {
    BalanceWidget.updateSnapshot({
      balanceDisplay: '$1,234.56',
      label: 'Total balance',
      theme: {} as never,
    });

    expect(BalanceWidget.updateSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ balanceDisplay: '$1,234.56' }),
    );
  });
});
