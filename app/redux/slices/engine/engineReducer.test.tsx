// TODO: Adapt tests when RTK is reintroduced for engine
import engineReducer from '.';
import { createAction } from '@reduxjs/toolkit';

// Create an action to initialize the background state
const initBgState = createAction('INIT_BG_STATE');

jest.mock('../../../core/Engine', () => ({
  init: () => jest.requireActual('../../../core/Engine').default.init({}),
  state: {},
}));

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
  SnapController: {},
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
});
