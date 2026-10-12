import { useAccountGroupBalance } from './useAccountGroupDisplay';
import { renderHookWithProvider } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockBalances: Record<
  string,
  { totalBalanceInUserCurrency: number; userCurrency?: string }
> = {};

jest.mock('../../../selectors/assets/balances', () => {
  const actual = jest.requireActual('../../../selectors/assets/balances');
  return {
    ...actual,
    selectBalanceByAccountGroup: (groupId: string) => () =>
      mockBalances[groupId] ?? {
        totalBalanceInUserCurrency: 0,
        userCurrency: 'usd',
      },
  };
});

const stateWithPrivacyMode = (privacyMode: boolean) => ({
  engine: {
    backgroundState: {
      PreferencesController: {
        ...backgroundState.PreferencesController,
        privacyMode,
      },
    },
  },
});

describe('useAccountGroupBalance', () => {
  beforeEach(() => {
    Object.keys(mockBalances).forEach((key) => delete mockBalances[key]);
  });

  it('formats a non-zero fiat balance', () => {
    mockBalances['group-1'] = {
      totalBalanceInUserCurrency: 10000,
      userCurrency: 'usd',
    };

    const { result } = renderHookWithProvider(
      () => useAccountGroupBalance('group-1'),
      { state: stateWithPrivacyMode(false) },
    );

    expect(result.current).toEqual({
      balanceLabel: '$10,000.00',
      isBalanceHidden: false,
    });
  });

  it('returns no label for a zero balance', () => {
    mockBalances['group-1'] = {
      totalBalanceInUserCurrency: 0,
      userCurrency: 'usd',
    };

    const { result } = renderHookWithProvider(
      () => useAccountGroupBalance('group-1'),
      { state: stateWithPrivacyMode(false) },
    );

    expect(result.current.balanceLabel).toBeUndefined();
  });

  it('returns no label when the currency is missing', () => {
    mockBalances['group-1'] = { totalBalanceInUserCurrency: 25 };

    const { result } = renderHookWithProvider(
      () => useAccountGroupBalance('group-1'),
      { state: stateWithPrivacyMode(false) },
    );

    expect(result.current.balanceLabel).toBeUndefined();
  });

  it('hides a shown balance while privacy mode is on', () => {
    mockBalances['group-1'] = {
      totalBalanceInUserCurrency: 25,
      userCurrency: 'usd',
    };

    const { result } = renderHookWithProvider(
      () => useAccountGroupBalance('group-1'),
      { state: stateWithPrivacyMode(true) },
    );

    expect(result.current.isBalanceHidden).toBe(true);
  });
});
