import engineReducer, { initBgState, updateBgState } from '.';

jest.mock('../../../Engine', () => ({
  init: () => jest.requireActual('../../../Engine').default.init({}),
  state: {},
}));
// importing Engine after mocking to avoid global mock from overwriting its values
import Engine from '../../../Engine';

describe('engineReducer', () => {
  it('should return the initial state in default', () => {
    jest.isolateModules(() => {
      jest.mock('../../../Engine', () => ({
        init: () => jest.requireActual('../../../Engine').default.init({}),
        state: {},
      }));
    });

    const initialStatDefault = { backgroundState: {} };
    const nextState = engineReducer(undefined, {} as any);
    expect(nextState).toEqual(initialStatDefault);
  });

  it('should initialize backgroundState when dispatching INIT_BG_STATE action', () => {
    const initialState = { backgroundState: {} };
    const nextState = engineReducer(initialState, initBgState());
    expect(nextState).toEqual({ backgroundState: Engine.state });
  });

  it('should update backgroundState when dispatching UPDATE_BG_STATE action', () => {
    const reduxInitialState = {
      backgroundState: {
        AccountTrackerController: {},
      },
    };

    const key = 'AccountTrackerController';
    // changing the mock version to suit this test manually due to our current global mock
    (Engine as any).state = {
      AccountTrackerController: { accounts: 'testValue' },
    };
    const { backgroundState } = engineReducer(
      reduxInitialState,
      updateBgState({ key }),
    );
    expect(backgroundState).toEqual({
      ...reduxInitialState.backgroundState,
      AccountTrackerController: Engine.state[key],
    });
  });
});
