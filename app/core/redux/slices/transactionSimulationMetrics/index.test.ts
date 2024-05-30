import reducer, {
  updateTransactionSimulationMetric,
  TransactionSimulationsMetricsState,
} from '.';

describe('TransactionSimulationMetrics slice', () => {
  // Define the initial state for your tests
  const initialState: TransactionSimulationsMetricsState = {
    simulations: {},
  };

  it('should handle initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({
      simulations: {},
    });
  });

  it('should handle updateTransactionSimulationMetric', () => {
    const mockTransactionId = 'testId';
    const mockParams = { test: 'test' };
    const actual = reducer(
      initialState,
      updateTransactionSimulationMetric({
        transactionId: mockTransactionId,
        params: mockParams,
      }),
    );
    expect(actual.simulations[mockTransactionId]).toStrictEqual(mockParams);
  });
});
