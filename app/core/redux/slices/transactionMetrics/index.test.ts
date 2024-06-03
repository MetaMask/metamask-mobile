import reducer, {
  updateTransactionMetric,
  TransactionMetricsState,
} from '.';

describe('TransactionMetrics slice', () => {
  // Define the initial state for your tests
  const initialState: TransactionMetricsState = {
    simulationPropertiesByTransactionId: {},
  };

  it('should handle initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({
      simulationPropertiesByTransactionId: {},
    });
  });

  it('should handle updateTransactionMetric', () => {
    const mockTransactionId = 'testId';
    const mockParams = { test: 'test' };
    const actual = reducer(
      initialState,
      updateTransactionMetric({
        transactionId: mockTransactionId,
        params: mockParams,
      }),
    );
    expect(
      actual.simulationPropertiesByTransactionId[mockTransactionId],
    ).toStrictEqual(mockParams);
  });
});
