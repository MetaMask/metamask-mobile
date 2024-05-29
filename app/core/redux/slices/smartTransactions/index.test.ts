import reducer, {
  updateOptInModalAppVersionSeen,
  SmartTransactionsState,
} from '.';

describe('smartTransactions slice', () => {
  // Define the initial state for your tests
  const initialState: SmartTransactionsState = {
    optInModalAppVersionSeen: null,
  };

  it('should handle initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({
      optInModalAppVersionSeen: null,
    });
  });

  it('should handle updateOptInModalAppVersionSeen', () => {
    const actual = reducer(
      initialState,
      updateOptInModalAppVersionSeen('2.0.0'),
    );
    expect(actual.optInModalAppVersionSeen).toEqual('2.0.0');
  });
});
