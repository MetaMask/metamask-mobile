import { act } from '@testing-library/react-native';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useMoneyPredictDeposit } from './useMoneyPredictDeposit';
import { usePredictTrading } from '../../../../UI/Predict/hooks/usePredictTrading';
import { useConfirmNavigation } from '../useConfirmNavigation';
import { selectMetaMaskPayFlags } from '../../../../../selectors/featureFlagController/confirmations';
import Routes from '../../../../../constants/navigation/Routes';
import { PayWithOption } from '../../components/confirm/confirm-component';

const mockDepositWithConfirmation = jest
  .fn()
  .mockResolvedValue({ result: Promise.resolve('0xhash') });
const mockNavigateToConfirmation = jest.fn();

jest.mock('../../../../UI/Predict/hooks/usePredictTrading', () => ({
  usePredictTrading: jest.fn(),
}));

jest.mock('../useConfirmNavigation', () => ({
  useConfirmNavigation: jest.fn(),
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

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

describe('useMoneyPredictDeposit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
