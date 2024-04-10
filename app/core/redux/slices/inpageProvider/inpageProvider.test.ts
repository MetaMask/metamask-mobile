import reducer, {
  networkIdUpdated,
  networkIdWillUpdate,
  InpageProviderState,
  NETWORK_ID_LOADING,
} from '.';

describe('inpageProviderSlice', () => {
  // Define the initial state for your tests
  const initialState: InpageProviderState = {
    networkId: NETWORK_ID_LOADING,
  };

  it('should handle initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual({
      networkId: NETWORK_ID_LOADING,
    });
  });

  it('should handle networkIdUpdated', () => {
    const actual = reducer(initialState, networkIdUpdated('1'));
    expect(actual.networkId).toEqual('1');
  });

  it('should handle networkWillUpdate', () => {
    // Assuming the initial state has a specific networkId
    const customInitialState: InpageProviderState = { networkId: '123' };
    const actual = reducer(customInitialState, networkIdWillUpdate());
    expect(actual.networkId).toEqual(NETWORK_ID_LOADING);
  });
});
