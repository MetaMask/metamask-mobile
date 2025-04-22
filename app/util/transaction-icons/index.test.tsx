import { getTransactionIcon } from './index';
import { AppThemeKey } from '../theme/models';
import { ColorSchemeName } from 'react-native';

import transactionIconInteraction from '../../images/transaction-icons/interaction.png';
import transactionIconSent from '../../images/transaction-icons/send.png';
import transactionIconReceived from '../../images/transaction-icons/receive.png';
import transactionIconSwap from '../../images/transaction-icons/swap.png';
import transactionIconInteractionFailed from '../../images/transaction-icons/interaction-failed.png';
import transactionIconSentFailed from '../../images/transaction-icons/send-failed.png';
import transactionIconReceivedFailed from '../../images/transaction-icons/receive-failed.png';
import transactionIconSwapFailed from '../../images/transaction-icons/swap-failed.png';

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
    ).toBe(transactionIconSwap);
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
    ).toBe(transactionIconSwapFailed);
  });

  test('returns the failed interaction icon for failed bridge transactions', () => {
    expect(
      getTransactionIcon('bridge', true, defaultAppTheme, defaultOsColorScheme),
    ).toBe(transactionIconInteractionFailed);
  });
});
