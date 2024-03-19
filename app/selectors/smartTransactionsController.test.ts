import { getSmartTransactionsEnabled } from './smartTransactionsController';
import initialBackgroundState from '../util/test/initial-background-state.json';
import { cloneDeep } from 'lodash';
import { isHardwareAccount } from '../util/address';

jest.mock('../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

const defaultState: any = {
  engine: {
    backgroundState: initialBackgroundState,
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

describe('SmartTransactionsController Selectors', () => {
  describe('getSmartTransactionsEnabled', () => {
    it('should return true if smart transactions are enabled', () => {
      const enabled = getSmartTransactionsEnabled(defaultState);
      expect(enabled).toEqual(true);
    });
    it.each([
      ['an empty object', {}],
      ['undefined', undefined],
    ])(
      'should return false if smart transactions feature flags are not enabled when smartTransactions is %s',
      (_testCaseName, smartTransactions) => {
        const state = cloneDeep(defaultState);
        state.swaps['0x1'].smartTransactions = smartTransactions;

        const enabled = getSmartTransactionsEnabled(state);
        expect(enabled).toEqual(false);
      },
    );
    it('should return false if address is hardware account', () => {
      (isHardwareAccount as jest.Mock).mockReturnValueOnce(true);
      const enabled = getSmartTransactionsEnabled(defaultState);
      expect(enabled).toEqual(false);
    });
    it('should return false if is mainnet and not the default RPC', () => {
      const state = cloneDeep(defaultState);
      state.engine.backgroundState.NetworkController.providerConfig.rpcUrl =
        'https://example.com';
      const enabled = getSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
  });
  // describe('getIsSmartTransaction', () => {
  //   it('should return true if smart transactions are enabled', () => {});
  //   it('should return false if smart transactions are not enabled', () => {});
  // });
});
