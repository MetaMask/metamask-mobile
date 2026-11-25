import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useLighterWithdrawableBalance } from '../../temp-lighter/useLighterWithdrawableBalance';
import { usePerpsProviderBalance } from './usePerpsProviderBalance';

const mockUsePerpsLiveAccount = jest.fn();
jest.mock('../../../../UI/Perps/hooks/stream/usePerpsLiveAccount', () => ({
  usePerpsLiveAccount: () => mockUsePerpsLiveAccount(),
}));
jest.mock('../../temp-lighter/useLighterWithdrawableBalance');

function runHook(
  perpsBalances: Record<
    string,
    { totalBalance: string; unrealizedPnl: string; lastUpdated: number }
  >,
) {
  return renderHookWithProvider(() => usePerpsProviderBalance(), {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          PerpsController: {
            ...backgroundState.PerpsController,
            perpsBalances,
          },
        },
      },
    },
  });
}

describe('usePerpsProviderBalance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUsePerpsLiveAccount.mockReturnValue({
      account: { totalBalance: '50.389' },
      isInitialLoading: false,
    });
  });

  it('uses the controller balance for Lighter without enabling the fallback', () => {
    jest.mocked(useLighterWithdrawableBalance).mockReturnValue('7');

    const { result } = runHook({
      lighter: { totalBalance: '12.349', unrealizedPnl: '0', lastUpdated: 1 },
    });

    expect(result.current).toStrictEqual({
      hyperliquid: '$50.38',
      lighter: '$12.34',
    });
    expect(jest.mocked(useLighterWithdrawableBalance).mock.lastCall?.[1]).toBe(
      false,
    );
  });

  it('falls back to the fetched Lighter balance when the controller has none', () => {
    jest.mocked(useLighterWithdrawableBalance).mockReturnValue('7.579');

    const { result } = runHook({});

    expect(result.current.lighter).toBe('$7.57');
    expect(jest.mocked(useLighterWithdrawableBalance).mock.lastCall?.[1]).toBe(
      true,
    );
  });

  it('shows zero while the fallback balance loads', () => {
    jest.mocked(useLighterWithdrawableBalance).mockReturnValue(undefined);

    const { result } = runHook({});

    expect(result.current.lighter).toBe('$0');
  });
});
