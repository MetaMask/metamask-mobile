import { getSmartTransactionsEnabled } from './smartTransactionsController';
import initialBackgroundState from '../util/test/initial-background-state.json';
import { isHardwareAccount } from '../util/address';
import { cloneDeep } from 'lodash';

jest.mock('../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

const getDefaultState = () => {
  const defaultState: any = {
    engine: {
      backgroundState: cloneDeep(initialBackgroundState),
    },
    swaps: {
      '0x1': {
        isLive: true,
        smartTransactions: {
          foo: 123,
        },
      },
    },
  };
  defaultState.engine.backgroundState.PreferencesController.selectedAddress =
    '0xabc';
  defaultState.engine.backgroundState.NetworkController.providerConfig = {
    rpcUrl: undefined, // default rpc for chain 0x1
    chainId: '0x1',
  };
  defaultState.engine.backgroundState.SmartTransactionsController.smartTransactionsState.liveness =
    true;
  defaultState.engine.backgroundState.PreferencesController.smartTransactionsOptInStatus =
    true;

  return defaultState;
};

describe('SmartTransactionsController Selectors', () => {
  describe('getSmartTransactionsEnabled', () => {
    it.each([
      ['an empty object', {}],
      ['undefined', undefined],
    ])(
      'should return false if smart transactions feature flags are not enabled when smartTransactions is %s',
      (_testCaseName, smartTransactions) => {
        const state = getDefaultState();
        state.swaps['0x1'].smartTransactions = smartTransactions;

        const enabled = getSmartTransactionsEnabled(state);
        expect(enabled).toEqual(false);
      },
    );
    it('should return false if smart transactions liveness is false', () => {
      const state = getDefaultState();
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.liveness =
        false;
      const enabled = getSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('should return false if address is hardware account', () => {
      (isHardwareAccount as jest.Mock).mockReturnValueOnce(true);
      const state = getDefaultState();
      const enabled = getSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('should return false if is mainnet and not the default RPC', () => {
      const state = getDefaultState();
      state.engine.backgroundState.NetworkController.providerConfig.rpcUrl =
        'https://example.com';
      const enabled = getSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('should return true if smart transactions are enabled', () => {
      const state = getDefaultState();
      const enabled = getSmartTransactionsEnabled(state);
      expect(enabled).toEqual(true);
    });
  });
  // describe('getIsSmartTransaction', () => {
  //   it('should return false if smart transactions are not opted into', () => {});
  //   it('should return false if smart transactions are not enabled', () => {});
  //   it('should return true if smart transactions are enabled and opted into', () => {});
  // });
});
