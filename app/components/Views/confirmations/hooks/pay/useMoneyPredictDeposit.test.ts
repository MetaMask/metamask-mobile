import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useMoneyPredictDeposit } from './useMoneyPredictDeposit';
import { usePredictTrading } from '../../../../UI/Predict/hooks/usePredictTrading';
import { useConfirmNavigation } from '../useConfirmNavigation';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import Routes from '../../../../../constants/navigation/Routes';
import {
  ConfirmationLoader,
  PayWithOption,
} from '../../components/confirm/confirm-component';
import { useMoneyAccountAvailability } from '../../../../UI/Money/hooks/useMoneyAccountAvailability';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';

const mockDepositWithConfirmation = jest
  .fn()
  .mockResolvedValue({ result: Promise.resolve('0xhash') });
const mockNavigateToConfirmation = jest.fn();
const mockAssertMoneyAccountAccessible = jest.fn();

jest.mock('../../../../UI/Predict/hooks/usePredictTrading', () => ({
  usePredictTrading: jest.fn(),
}));

jest.mock('../useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
}));

jest.mock('../../../../UI/Money/hooks/useMoneyAccountAvailability', () => ({
  ...jest.requireActual(
    '../../../../UI/Money/hooks/useMoneyAccountAvailability',
  ),
  useMoneyAccountAvailability: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ),
    selectMetaMaskPayFlags: jest.fn(),
  }),
);

// Only `state`, which `updateBgState` publishes to Redux.
jest.mock('../../../../../core/Engine', () => ({ state: {} }));

const KALSHI_ONLY = {
  enabled: true,
  venues: { polymarket: { enabled: false }, kalshi: { enabled: true } },
  venueSelection: { enabled: false },
};

const remoteFeatureFlagState = (predictConfig?: typeof KALSHI_ONLY) => ({
  ...backgroundState.RemoteFeatureFlagController,
  remoteFeatureFlags: {
    ...backgroundState.RemoteFeatureFlagController.remoteFeatureFlags,
    predictConfig,
  },
});

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

describe('useMoneyPredictDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssertMoneyAccountAccessible.mockImplementation(() => undefined);
    (useMoneyAccountAvailability as jest.Mock).mockReturnValue({
      accessBlockReason: undefined,
      isMoneyAccountAccessible: true,
      assertMoneyAccountAccessible: mockAssertMoneyAccountAccessible,
    });
    (usePredictTrading as jest.Mock).mockReturnValue({
      deposit: mockDepositWithConfirmation,
    });
    (useConfirmNavigation as jest.Mock).mockReturnValue({
      navigateToConfirmation: mockNavigateToConfirmation,
    });
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      enableMoneyAccountTransactions: {},
    });
  });

  const render = () => renderHookWithProvider(() => useMoneyPredictDeposit());

  it.each([
    ['feature disabled', 'feature_disabled'],
    ['geo-blocked', 'geo_blocked'],
  ] as const)(
    'rejects a deposit when Money is %s before navigation',
    async (_label, reason) => {
      mockAssertMoneyAccountAccessible.mockImplementation(() => {
        throw Object.assign(new Error('Money account access blocked'), {
          reason,
        });
      });
      (useMoneyAccountAvailability as jest.Mock).mockReturnValue({
        accessBlockReason: reason,
        isMoneyAccountAccessible: false,
        assertMoneyAccountAccessible: mockAssertMoneyAccountAccessible,
      });

      const { result } = render();

      await expect(
        act(async () => {
          await result.current.initiatePredictDeposit();
        }),
      ).rejects.toMatchObject({ reason });

      expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    },
  );

  it('returns isEnabled false when flag is disabled', () => {
    const { result } = render();
    expect(result.current.isEnabled).toBe(false);
  });

  it('returns isEnabled true when flag is enabled', () => {
    (selectMetaMaskPayFlags as unknown as jest.Mock).mockReturnValue({
      enableMoneyAccountTransactions: { predictDeposit: true },
    });

    const { result } = render();
    expect(result.current.isEnabled).toBe(true);
  });

  it('navigates with payWithOption and deposits', async () => {
    const { result } = render();

    await act(async () => {
      await result.current.initiatePredictDeposit();
    });

    expect(mockNavigateToConfirmation).toHaveBeenCalledWith({
      loader: ConfirmationLoader.CustomAmount,
      stack: Routes.PREDICT.ROOT,
      payWithOption: PayWithOption.MoneyAccount,
    });
    expect(mockDepositWithConfirmation).toHaveBeenCalledWith({});
  });

  it('logs error when deposit fails', async () => {
    mockDepositWithConfirmation.mockRejectedValueOnce(
      new Error('deposit-failed'),
    );

    const { result } = render();

    await act(async () => {
      await result.current.initiatePredictDeposit();
    });

    const Logger = jest.requireMock('../../../../../util/Logger').default;
    expect(Logger.error).toHaveBeenCalledTimes(1);
  });

  describe('Active Venue gate', () => {
    it('starts nothing while Kalshi is active', async () => {
      const { result } = renderHookWithProvider(
        () => useMoneyPredictDeposit(),
        {
          state: {
            engine: {
              backgroundState: {
                ...backgroundState,
                RemoteFeatureFlagController:
                  remoteFeatureFlagState(KALSHI_ONLY),
              },
            },
          },
        },
      );

      await act(async () => {
        await result.current.initiatePredictDeposit();
      });

      expect(mockAssertMoneyAccountAccessible).not.toHaveBeenCalled();
      expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    });

    it('re-checks when it runs, so a deposit captured on Polymarket starts nothing after a switch to Kalshi', async () => {
      const { result, store } = renderHookWithProvider(
        () => useMoneyPredictDeposit(),
        {
          state: {
            engine: {
              backgroundState: {
                ...backgroundState,
                RemoteFeatureFlagController: remoteFeatureFlagState(),
              },
            },
          },
        },
      );
      const { initiatePredictDeposit } = result.current;

      act(() => {
        (Engine as unknown as { state: Record<string, unknown> }).state = {
          RemoteFeatureFlagController: remoteFeatureFlagState(KALSHI_ONLY),
        };
        store.dispatch(updateBgState({ key: 'RemoteFeatureFlagController' }));
      });
      await act(async () => {
        await initiatePredictDeposit();
      });

      expect(mockNavigateToConfirmation).not.toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    });
  });
});
