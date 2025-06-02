import {
  selectShouldUseSmartTransaction,
  selectSmartTransactionsEnabled,
  selectSmartTransactionsForCurrentChain,
  // Add the pending selector to test it.
  selectPendingSmartTransactionsBySender,
} from './smartTransactionsController';
import { backgroundState } from '../util/test/initial-root-state';
import { isHardwareAccount } from '../util/address';
import { cloneDeep } from 'lodash';

const TEST_ADDRESS_ONE = '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d';
const TEST_ADDRESS_TWO = '0x202637daaefbd7f131f90338a4a6c69f6cd5ce91';

// Stub the accounts selector so that selectSelectedInternalAccountFormattedAddress returns TEST_ADDRESS_ONE
jest.mock('./accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(
    () => TEST_ADDRESS_ONE,
  ),
  selectSelectedInternalAccountAddress: jest.fn(() => TEST_ADDRESS_ONE),
  selectHasCreatedSolanaMainnetAccount: jest.fn(() => false),
}));

jest.mock('./tokensController', () => ({
  selectTokensControllerState: jest.fn(),
  selectTokens: jest.fn(() => []),
  selectAllTokens: jest.fn(() => []),
}));

jest.mock('../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

// Default state is setup to be on mainnet, with smart transactions enabled and opted into
const getDefaultState = () => {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultState: any = {
    engine: {
      backgroundState: cloneDeep(backgroundState),
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
            mobileReturnTxHashAsap: false,
          },
        },
      },
      '0x10': {
        isLive: true,
        featureFlags: {
          smartTransactions: {
            expectedDeadline: 45,
            maxDeadline: 160,
            mobileReturnTxHashAsap: false,
          },
        },
      },
    },
  };
  defaultState.engine.backgroundState.NetworkController.providerConfig = {
    rpcUrl: undefined, // default rpc for chain 0x1
    chainId: '0x1',
  };
  defaultState.engine.backgroundState.SmartTransactionsController.smartTransactionsState.liveness =
    true;
  defaultState.engine.backgroundState.PreferencesController.smartTransactionsOptInStatus =
    true;

  defaultState.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions =
    {
      '0x1': [],
    };

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
    it('should accept an optional chainId parameter', () => {
      const state = getDefaultState();
      state.swaps.featureFlags.smart_transactions.mobile_active = true;
      state.swaps.featureFlags.smartTransactions.mobileActive = true;
      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state, '0x1');
      expect(shouldUseSmartTransaction).toEqual(true);
    });
  });

  describe('getSmartTransactionsForCurrentChain', () => {
    it('should return the smart transactions for the current chain', () => {
      const state = getDefaultState();
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions[
        '0x1'
      ] = [
        {
          id: '1',
          status: 'pending',
          type: 'swap',
        },
      ];
      const smartTransactions = selectSmartTransactionsForCurrentChain(state);
      expect(smartTransactions).toEqual([
        {
          id: '1',
          status: 'pending',
          type: 'swap',
        },
      ]);
    });
    it('should return an empty array if there are no smart transactions for the current chain', () => {
      const state = getDefaultState();
      const smartTransactions = selectSmartTransactionsForCurrentChain(state);
      expect(smartTransactions).toEqual([]);
    });
  });

  describe('selectPendingSmartTransactionsBySender', () => {
    it('should return an empty array if there are no smart transactions for the current chain', () => {
      const state = getDefaultState();
      // Ensure no transactions for chain '0x1'
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions[
        '0x1'
      ] = [];
      const pending = selectPendingSmartTransactionsBySender(state);
      expect(pending).toEqual([]);
    });

    it('should filter out transactions that do not match the selected sender', () => {
      const state = getDefaultState();
      // Two transactions, one with matching sender and one not matching
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions[
        '0x1'
      ] = [
        {
          uuid: 'tx1',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'pending',
        },
        {
          uuid: 'tx2',
          txParams: { from: TEST_ADDRESS_TWO },
          status: 'pending',
        },
      ];
      const pending = selectPendingSmartTransactionsBySender(state);
      // Only the transaction from TEST_ADDRESS_ONE (case-insensitive) should be returned
      expect(pending).toEqual([
        {
          uuid: 'tx1',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'pending',
          id: 'tx1',
          isSmartTransaction: true,
        },
      ]);
    });

    it('should filter out transactions with status SUCCESS or CANCELLED', () => {
      const state = getDefaultState();
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions[
        '0x1'
      ] = [
        {
          uuid: 'tx1',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'SUCCESS',
        },
        {
          uuid: 'tx2',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'CANCELLED',
        },
        {
          uuid: 'tx3',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'pending',
        },
      ];
      const pending = selectPendingSmartTransactionsBySender(state);
      expect(pending).toEqual([
        {
          uuid: 'tx1',
          txParams: { from: '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d' },
          status: 'SUCCESS',
          id: 'tx1',
          isSmartTransaction: true,
        },
        {
          uuid: 'tx2',
          txParams: { from: '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d' },
          status: 'CANCELLED',
          id: 'tx2',
          isSmartTransaction: true,
        },
        {
          uuid: 'tx3',
          txParams: { from: '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d' },
          status: 'pending',
          id: 'tx3',
          isSmartTransaction: true,
        },
      ]);
    });
  });
});
