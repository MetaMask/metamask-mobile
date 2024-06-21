import {
  selectShouldUseSmartTransaction,
  selectSmartTransactionsEnabled,
} from './smartTransactionsController';
import initialBackgroundState from '../util/test/initial-background-state.json';
import { isHardwareAccount } from '../util/address';
import { cloneDeep } from 'lodash';

jest.mock('../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

// Default state is setup to be on mainnet, with smart transactions enabled and opted into
const getDefaultState = () => {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultState: any = {
    engine: {
      backgroundState: cloneDeep(initialBackgroundState),
    },
    swaps: {
      featureFlags: {
        smart_transactions: {
          mobile_active: false,
          extension_active: true,
        },
        smartTransactions: {
          mobileActive: false,
          extensionActive: true,
          mobileActiveIOS: false,
          mobileActiveAndroid: false,
        },
      },
      '0x1': {
        isLive: true,
        featureFlags: {
          smartTransactions: {
            expectedDeadline: 45,
            maxDeadline: 160,
            returnTxHashAsap: false,
          },
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

        const enabled = selectSmartTransactionsEnabled(state);
        expect(enabled).toEqual(false);
      },
    );
    it('should return false if smart transactions liveness is false', () => {
      const state = getDefaultState();
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.liveness =
        false;
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('should return false if address is hardware account', () => {
      (isHardwareAccount as jest.Mock).mockReturnValueOnce(true);
      const state = getDefaultState();
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('should return false if is mainnet and not the default RPC', () => {
      const state = getDefaultState();
      state.engine.backgroundState.NetworkController.providerConfig.rpcUrl =
        'https://example.com';
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('should return true if smart transactions are enabled', () => {
      const state = getDefaultState();
      state.swaps.featureFlags.smart_transactions.mobile_active = true;
      state.swaps.featureFlags.smartTransactions.mobileActive = true;

      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(true);
    });
  });
  describe('getShouldUseSmartTransaction', () => {
    it('should return false if smart transactions are not opted into', () => {
      const state = getDefaultState();
      state.engine.backgroundState.PreferencesController.smartTransactionsOptInStatus =
        false;
      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state);
      expect(shouldUseSmartTransaction).toEqual(false);
    });
    it('should return false if smart transactions are not enabled', () => {
      const state = getDefaultState();
      state.swaps['0x1'].smartTransactions = {};
      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state);
      expect(shouldUseSmartTransaction).toEqual(false);
    });
    it('should return true if smart transactions are enabled and opted into', () => {
      const state = getDefaultState();
      state.swaps.featureFlags.smart_transactions.mobile_active = true;
      state.swaps.featureFlags.smartTransactions.mobileActive = true;

      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state);
      expect(shouldUseSmartTransaction).toEqual(true);
    });
  });
});
