// TODO: Adapt tests when RTK is reintroduced for engine
import engineReducer from '.';
import { createAction } from '@reduxjs/toolkit';

// Create an action to initialize the background state
export const initBgState = createAction('INIT_BG_STATE');

// Create an action to update the background state
export const updateBgState = createAction('UPDATE_BG_STATE', (key) => ({
  payload: key,
}));

jest.mock('../../../core/Engine', () => ({
  init: () => jest.requireActual('../../../core/Engine').default.init({}),
  state: {},
}));
// importing Engine after mocking to avoid global mock from overwriting its values
import Engine from '../../../core/Engine';

const backgroundState = {
  AccountTrackerController: {},
  AddressBookController: {},
  ApprovalController: {},
  AssetsContractController: {},
  CurrencyRateController: {},
  GasFeeController: {},
  KeyringController: {},
  LoggingController: {},
  NetworkController: {},
  NftController: {},
  NftDetectionController: {},
  PermissionController: {},
  PhishingController: {},
  PreferencesController: {},
  SwapsController: {},
  TokenBalancesController: {},
  TokenDetectionController: {},
  TokenListController: {},
  TokenRatesController: {},
  TokensController: {},
  TransactionController: {},
};

describe('engineReducer', () => {
  it('should return the initial state in default', () => {
    jest.isolateModules(() => {
      jest.mock('../../../core/Engine', () => ({
        init: () =>
          jest.requireActual('../../../core/Enginee').default.init({}),
        state: {},
      }));
    });

    const initialStatDefault = { backgroundState };
    const nextState = engineReducer(undefined, {} as any);
    expect(nextState).toEqual(initialStatDefault);
  });

  it('should initialize backgroundState when dispatching INIT_BG_STATE action', () => {
    const initialState = { backgroundState };
    const nextState = engineReducer(initialState, initBgState());
    expect(nextState).toEqual({ backgroundState });
  });

  it('should update backgroundState when dispatching UPDATE_BG_STATE action', () => {
    const reduxInitialState = {
      backgroundState,
    };

    const key = 'AccountTrackerController';
    // changing the mock version to suit this test manually due to our current global mock
    (Engine as any).state = {
      AccountTrackerController: { accounts: 'testValue' },
    };
    const { backgroundState: engineBackgroundState } = engineReducer(
      reduxInitialState,
      updateBgState({ key }),
    );
    console.log(
      'Engine STATE: ',
      Engine.state,
      'Engine BKSTATE:',
      engineBackgroundState,
      'EQUAL:',
      {
        ...reduxInitialState.backgroundState,
        AccountTrackerController: Engine.state[key],
      },
    );
    expect(engineBackgroundState).toEqual({
      ...reduxInitialState.backgroundState,
      AccountTrackerController: Engine.state[key],
    });
  });
});
