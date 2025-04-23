import { getTransactionIcon } from './index';
import { AppThemeKey } from '../theme/models';
import { ColorSchemeName } from 'react-native';

import transactionIconInteraction from '../../images/transaction-icons/interaction.png';
import transactionIconSent from '../../images/transaction-icons/send.png';
import transactionIconReceived from '../../images/transaction-icons/receive.png';
import transactionIconSwapLight from '../../images/transaction-icons/swap.png';
import transactionIconSwapDark from '../../images/transaction-icons/swap-dark.png';
import transactionIconInteractionFailed from '../../images/transaction-icons/interaction-failed.png';
import transactionIconSentFailed from '../../images/transaction-icons/send-failed.png';
import transactionIconReceivedFailed from '../../images/transaction-icons/receive-failed.png';
import transactionIconSwapFailedLight from '../../images/transaction-icons/swap-failed.png';
import transactionIconSwapFailedDark from '../../images/transaction-icons/swap-failed-dark.png';

describe('getTransactionIcon', () => {
  const defaultAppTheme = AppThemeKey.light;
  const defaultOsColorScheme: ColorSchemeName = 'light';

  test('returns the correct icon for successful send transactions', () => {
    expect(
      getTransactionIcon('send', false, defaultAppTheme, defaultOsColorScheme),
    ).toBe(transactionIconSent);
  });

  test('returns the correct icon for successful receive transactions', () => {
    expect(
      getTransactionIcon(
        'receive',
        false,
        defaultAppTheme,
        defaultOsColorScheme,
      ),
    ).toBe(transactionIconReceived);
  });

  test('returns the correct icon for successful swap transactions', () => {
    expect(
      getTransactionIcon('swap', false, defaultAppTheme, defaultOsColorScheme),
    ).toBe(transactionIconSwapLight);
  });

  test('returns the interaction icon for bridge transactions', () => {
    expect(
      getTransactionIcon(
        'bridge',
        false,
        defaultAppTheme,
        defaultOsColorScheme,
      ),
    ).toBe(transactionIconInteraction);
  });

  test('returns the correct icon for failed send transactions', () => {
    expect(
      getTransactionIcon('send', true, defaultAppTheme, defaultOsColorScheme),
    ).toBe(transactionIconSentFailed);
  });

  test('returns the correct icon for failed receive transactions', () => {
    expect(
      getTransactionIcon(
        'receive',
        true,
        defaultAppTheme,
        defaultOsColorScheme,
      ),
    ).toBe(transactionIconReceivedFailed);
  });

  test('returns the correct icon for failed swap transactions', () => {
    expect(
      getTransactionIcon('swap', true, defaultAppTheme, defaultOsColorScheme),
    ).toBe(transactionIconSwapFailedLight);
  });

  test('returns the failed interaction icon for failed bridge transactions', () => {
    expect(
      getTransactionIcon('bridge', true, defaultAppTheme, defaultOsColorScheme),
    ).toBe(transactionIconInteractionFailed);
  });

  describe('theme-based icon selection', () => {
    test('returns light swap icon when app theme is light and OS scheme is light', () => {
      expect(
        getTransactionIcon('swap', false, AppThemeKey.light, 'light'),
      ).toBe(transactionIconSwapLight);
    });

    test('returns dark swap icon when app theme is dark and OS scheme is dark', () => {
      expect(
        getTransactionIcon('swap', false, AppThemeKey.dark, 'dark'),
      ).toBe(transactionIconSwapDark);
    });

    test('returns light swap icon when app theme is light and OS scheme is dark', () => {
      expect(
        getTransactionIcon('swap', false, AppThemeKey.light, 'dark'),
      ).toBe(transactionIconSwapLight);
    });

    test('returns dark swap icon when app theme is dark and OS scheme is light', () => {
      expect(
        getTransactionIcon('swap', false, AppThemeKey.dark, 'light'),
      ).toBe(transactionIconSwapDark);
    });
  });

  describe('failed transaction theme-based icon selection', () => {
    test('returns light failed swap icon when app theme is light and OS scheme is light', () => {
      expect(
        getTransactionIcon('swap', true, AppThemeKey.light, 'light'),
      ).toBe(transactionIconSwapFailedLight);
    });

    test('returns dark failed swap icon when app theme is dark and OS scheme is dark', () => {
      expect(
        getTransactionIcon('swap', true, AppThemeKey.dark, 'dark'),
      ).toBe(transactionIconSwapFailedDark);
    });

    test('returns light failed swap icon when app theme is light and OS scheme is dark', () => {
      expect(
        getTransactionIcon('swap', true, AppThemeKey.light, 'dark'),
      ).toBe(transactionIconSwapFailedLight);
    });

    test('returns dark failed swap icon when app theme is dark and OS scheme is light', () => {
      expect(
        getTransactionIcon('swap', true, AppThemeKey.dark, 'light'),
      ).toBe(transactionIconSwapFailedDark);
    });
  });

  describe('edge cases', () => {
    test('returns interaction icon for unknown transaction type', () => {
      expect(
        getTransactionIcon('unknown', false, defaultAppTheme, defaultOsColorScheme),
      ).toBe(transactionIconInteraction);
    });

    test('returns failed interaction icon for failed unknown transaction type', () => {
      expect(
        getTransactionIcon('unknown', true, defaultAppTheme, defaultOsColorScheme),
      ).toBe(transactionIconInteractionFailed);
    });

    test('handles empty transaction type', () => {
      expect(
        getTransactionIcon('', false, defaultAppTheme, defaultOsColorScheme),
      ).toBe(transactionIconInteraction);
    });
  });
});
