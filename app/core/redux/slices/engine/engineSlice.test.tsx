import { configureStore, PayloadAction } from '@reduxjs/toolkit';
import App from '../../../../components/Nav/App';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';

import engineReducer, { initBgState, updateBgState } from './engineReducer'; // Import your actions and reducer
import initialBackgroundState from '../../../../util/test/initial-background-state.json';
// import Engine, { EngineState } from '../../../Engine';

describe('engineReducer', () => {
  jest.mock('../../../Engine', () => ({
    init: () => jest.requireActual('../../../Engine').default.init({}),
    state: {},
  }));
  // beforeEach(() => {
  //   jest.resetAllMocks();
  //   // jest.clearAllMocks();
  //   // jest.resetModules();
  // });

  // afterEach(() => {
  //   jest.resetAllMocks();
  // });

  it('should return the initial state in default', () => {
    jest.isolateModules(() => {
      jest.mock('../../../Engine', () => ({
        init: () => jest.requireActual('../../../Engine').default.init({}),
        state: {},
      }));
    });

    const Engine = require('../../../Engine').default;
    console.log('ENGINE state default:', Engine);
    const initialStatDefault = { backgroundState: {} };
    const nextState = engineReducer(undefined, {} as any);
    expect(nextState).toEqual(initialStatDefault);
  });

  it.only('should initialize backgroundState when dispatching INIT_BG_STATE action', () => {
    // jest.isolateModules(() => {
    // jest.dontMock('../../../Engine');

    // });
    // jest.mock('../../../Engine', () => ({
    //   init: () => jest.requireActual('../../../Engine').default.init({}),
    //   state: {},
    // }));

    const Engine = require('../../../Engine');
    console.log('ENGINE state initialise:', Engine);
    const initialState = { backgroundState: {} };
    const nextState = engineReducer(initialState, initBgState());
    expect(nextState).toEqual({ backgroundState: Engine.state });
  });

  it('should update backgroundState when dispatching UPDATE_BG_STATE action', () => {
    // jest.mock('../../../Engine', () => ({
    //   init: () => mockEngine.init({}),
    //   state: {
    //     AccountTrackerController: 'dummyKeyUpdate',
    //   },
    // }));
    const reduxInitialState = {
      backgroundState: {
        AccountTrackerController: {},
      },
    };

    // const mockStore = configureStore({
    //   reducer: {
    //     engine: engineReducer as any,
    //   },
    // });

    // const store = mockStore(reduxInitialState);
    const mockStore = configureMockStore();
    const store = mockStore(reduxInitialState);

    const storeState = store.getState();
    // console.log('STORE STATE initial ======:', store.getState());
    console.log('ENGINE STATE update ===> ', Engine);

    const { backgroundState } = engineReducer(
      reduxInitialState,
      updateBgState({ key: 'AccountTrackerController' }),
    );
    // console.log('STORE STATE updated ======:', store.getState());
    // console.log('newStoreState ======:', backgroundState);
    expect(backgroundState).toEqual({
      ...reduxInitialState.backgroundState,
      AccountTrackerController: Engine.state['AccountTrackerController'], // Mocked Engine state value
    });
  });
});
