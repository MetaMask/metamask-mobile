import { QueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { predictWithdrawGasFeeTokenOptions } from './withdrawGasFeeToken';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      isWithdrawGasFeeTokenAvailable: jest.fn(),
    },
  },
}));

const PARAMS_MOCK = {
  address: '0x5648abf0e1f50740fabb5a672d0e57640c99572c',
  amountRaw: '50000',
};

describe('predictWithdrawGasFeeTokenOptions', () => {
  const isWithdrawGasFeeTokenAvailableMock = jest.mocked(
    Engine.context.PredictController.isWithdrawGasFeeTokenAvailable,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks the same amount again after an unavailable result', async () => {
    isWithdrawGasFeeTokenAvailableMock.mockResolvedValue(false);
    const queryClient = new QueryClient();
    const options = predictWithdrawGasFeeTokenOptions(PARAMS_MOCK);

    await queryClient.query(options);
    await queryClient.query(options);

    expect(isWithdrawGasFeeTokenAvailableMock).toHaveBeenCalledTimes(2);
  });

  it('reuses an available result for the same amount', async () => {
    isWithdrawGasFeeTokenAvailableMock.mockResolvedValue(true);
    const queryClient = new QueryClient();
    const options = predictWithdrawGasFeeTokenOptions(PARAMS_MOCK);

    await queryClient.query(options);
    await queryClient.query(options);

    expect(isWithdrawGasFeeTokenAvailableMock).toHaveBeenCalledTimes(1);
  });
});
