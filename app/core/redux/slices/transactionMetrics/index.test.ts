import reducer, { updateTransactionMetrics, TransactionMetricsState } from '.';

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

  it('should handle updateTransactionMetrics', () => {
    const mockTransactionId = 'testId';
    const mockParams = { test: 'test' };
    const actual = reducer(
      initialState,
      updateTransactionMetrics({
        transactionId: mockTransactionId,
        params: mockParams,
      }),
    );
    expect(
      actual.simulationPropertiesByTransactionId[mockTransactionId],
    ).toStrictEqual(mockParams);
  });
});
