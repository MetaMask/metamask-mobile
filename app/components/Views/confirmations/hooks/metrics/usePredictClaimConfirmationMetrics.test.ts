import { merge } from 'lodash';
import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { usePredictClaimConfirmationMetrics } from './usePredictClaimConfirmationMetrics';
import {
  simpleSendTransactionControllerMock,
  transactionIdMock,
} from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';

jest.mock('../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...(jest.requireActual(
    '../../../../../core/redux/slices/confirmationMetrics',
  ) as object),
  updateConfirmationMetric: jest.fn(),
}));

function runHook() {
  return renderHookWithProvider(usePredictClaimConfirmationMetrics, {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
    ),
  });
}

describe('usePredictClaimConfirmationMetrics', () => {
  const updateConfirmationMetricMock = jest.mocked(updateConfirmationMetric);

  beforeEach(() => {
    jest.resetAllMocks();

    updateConfirmationMetricMock.mockReturnValue({
      type: 'mockedAction',
    } as never);
  });

  it('adds metrics', () => {
    runHook();

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: transactionIdMock,
      params: {
        properties: expect.objectContaining({
          predict_claim_value_usd: 2250,
          predict_pnl: 750,
          predict_market_title: [
            'Market 1',
            'Market 2',
            'Market 3',
            'Market 4',
            'Market 5',
          ],
        }),
        sensitiveProperties: {},
      },
    });
  });
});
