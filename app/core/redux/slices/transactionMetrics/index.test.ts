import reducer, { updateTransactionMetrics, TransactionMetricsState } from '.';

describe('TransactionMetrics slice', () => {
  // Define the initial state for your tests
  const initialState: TransactionMetricsState = {
    metricsByTransactionId: {},
  };

  it('should handle initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({
      metricsByTransactionId: {},
    });
  });

  it('should handle updateTransactionMetrics', () => {
    const mockTransactionId = 'testId';
    const mockParams = {
      properties: { test: 'test' },
      sensitiveProperties: { test: 'test' },
    };
    const actual = reducer(
      initialState,
      updateTransactionMetrics({
        transactionId: mockTransactionId,
        params: mockParams,
      }),
    );
    expect(actual.metricsByTransactionId[mockTransactionId]).toStrictEqual(
      mockParams,
    );
  });
});
