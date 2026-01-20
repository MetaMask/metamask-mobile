import {
  selectShouldUseSmartTransaction,
  selectSmartTransactionsEnabled,
  selectSmartTransactionsForCurrentChain,
  // Add the pending selector to test it.
  selectPendingSmartTransactionsBySender,
  selectPendingSmartTransactionsForSelectedAccountGroup,
} from './smartTransactionsController';
import { backgroundState } from '../util/test/initial-root-state';
import { isHardwareAccount } from '../util/address';
import { cloneDeep } from 'lodash';
import { selectSelectedAccountGroupInternalAccounts } from './multichainAccounts/accountTreeController';

const TEST_ADDRESS_ONE = '0x5a3ca5cd63807ce5e4d7841ab32ce6b6d9bbba2d';
const TEST_ADDRESS_TWO = '0x202637daaefbd7f131f90338a4a6c69f6cd5ce91';

// Stub the accounts selector so that selectSelectedInternalAccountFormattedAddress returns TEST_ADDRESS_ONE
jest.mock('./accountsController', () => {
  const actual = jest.requireActual('./accountsController');
  return {
    ...actual,
    selectSelectedInternalAccountFormattedAddress: jest.fn(
      () => TEST_ADDRESS_ONE,
    ),
    selectSelectedInternalAccountAddress: jest.fn(() => TEST_ADDRESS_ONE),
    selectHasCreatedSolanaMainnetAccount: jest.fn(() => false),
  };
});

jest.mock('./tokensController', () => ({
  selectTokensControllerState: jest.fn(),
  selectTokens: jest.fn(() => []),
  selectAllTokens: jest.fn(() => []),
}));

jest.mock('../util/address', () => ({
  ...jest.requireActual('../util/address'),
  isHardwareAccount: jest.fn(() => false),
}));

jest.mock('./multichainAccounts/accountTreeController', () => {
  const actual = jest.requireActual(
    './multichainAccounts/accountTreeController',
  );
  return {
    ...actual,
    selectSelectedAccountGroupInternalAccounts: jest.fn(() => []),
  };
});

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
            mobileActive: true,
            extensionActive: true,
            mobileActiveIOS: true,
            mobileActiveAndroid: true,
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
  defaultState.engine.backgroundState.SmartTransactionsController.smartTransactionsState.livenessByChainId =
    { '0x1': true };
  defaultState.engine.backgroundState.PreferencesController.smartTransactionsOptInStatus = true;

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
      'returns false when smart transactions feature flags are not enabled and smartTransactions is %s',
      (_testCaseName, smartTransactions) => {
        const state = getDefaultState();
        state.swaps['0x1'].smartTransactions = smartTransactions;
        const enabled = selectSmartTransactionsEnabled(state);
        expect(enabled).toEqual(false);
      },
    );
    it('returns false when smart transactions liveness is false', () => {
      const state = getDefaultState();
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.livenessByChainId =
        { '0x1': false };
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('returns false if smart transactions liveness is not set for chain', () => {
      const state = getDefaultState();
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.livenessByChainId =
        {};
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('returns false for hardware account address', () => {
      (isHardwareAccount as jest.Mock).mockReturnValueOnce(true);
      const state = getDefaultState();
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('returns false on mainnet with non-default RPC', () => {
      const state = getDefaultState();
      state.engine.backgroundState.NetworkController.providerConfig.rpcUrl =
        'https://example.com';
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(false);
    });
    it('returns true when smart transactions are enabled', () => {
      const state = getDefaultState();
      state.swaps.featureFlags.smart_transactions.mobile_active = true;
      state.swaps.featureFlags.smartTransactions.mobileActive = true;
      const enabled = selectSmartTransactionsEnabled(state);
      expect(enabled).toEqual(true);
    });
  });

  describe('getShouldUseSmartTransaction', () => {
    it('returns false when smart transactions are not opted into', () => {
      const state = getDefaultState();
      state.engine.backgroundState.PreferencesController.smartTransactionsOptInStatus = false;
      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state);
      expect(shouldUseSmartTransaction).toEqual(false);
    });
    it('returns false when smart transactions are not enabled', () => {
      const state = getDefaultState();
      state.swaps['0x1'].smartTransactions = {};
      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state);
      expect(shouldUseSmartTransaction).toEqual(false);
    });
    it('returns true when smart transactions are enabled and opted into', () => {
      const state = getDefaultState();
      state.swaps.featureFlags.smart_transactions.mobile_active = true;
      state.swaps.featureFlags.smartTransactions.mobileActive = true;
      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(state);
      expect(shouldUseSmartTransaction).toEqual(true);
    });
    it('accepts an optional chainId parameter', () => {
      const state = getDefaultState();
      state.swaps.featureFlags.smart_transactions.mobile_active = true;
      state.swaps.featureFlags.smartTransactions.mobileActive = true;
      const shouldUseSmartTransaction = selectShouldUseSmartTransaction(
        state,
        '0x1',
      );
      expect(shouldUseSmartTransaction).toEqual(true);
    });
  });

  describe('getSmartTransactionsForCurrentChain', () => {
    it('returns the smart transactions for the current chain', () => {
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
    it('returns an empty array when there are no smart transactions for the current chain', () => {
      const state = getDefaultState();
      const smartTransactions = selectSmartTransactionsForCurrentChain(state);
      expect(smartTransactions).toEqual([]);
    });
  });

  describe('selectPendingSmartTransactionsBySender', () => {
    it('returns an empty array when there are no smart transactions for the current chain', () => {
      const state = getDefaultState();
      // Ensure no transactions for chain '0x1'
      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions[
        '0x1'
      ] = [];
      const pending = selectPendingSmartTransactionsBySender(state);
      expect(pending).toEqual([]);
    });

    it('filters out transactions that do not match the selected sender', () => {
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

    it('filters out transactions with status SUCCESS or CANCELLED', () => {
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

  describe('selectPendingSmartTransactionsForSelectedAccountGroup', () => {
    it('returns empty array when no selected group accounts', () => {
      const state = getDefaultState();
      (
        selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
      ).mockReturnValue([]);

      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions[
        '0x1'
      ] = [
        {
          uuid: 'tx1',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'pending',
        },
      ];

      const pending =
        selectPendingSmartTransactionsForSelectedAccountGroup(state);
      expect(pending).toEqual([]);
    });

    it('filters transactions to those sent from any selected group address', () => {
      const state = getDefaultState();
      (
        selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
      ).mockReturnValue([{ address: TEST_ADDRESS_ONE }]);

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
        { uuid: 'tx3', txParams: { from: undefined }, status: 'pending' },
      ];

      const pending =
        selectPendingSmartTransactionsForSelectedAccountGroup(state);
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

    it('excludes SUCCESS and CANCELLED, normalizes CANCELLED_* to CANCELLED', () => {
      const state = getDefaultState();
      (
        selectSelectedAccountGroupInternalAccounts as unknown as jest.Mock
      ).mockReturnValue([{ address: TEST_ADDRESS_ONE }]);

      state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions[
        '0x1'
      ] = [
        { uuid: 'a', txParams: { from: TEST_ADDRESS_ONE }, status: 'SUCCESS' },
        {
          uuid: 'b',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'CANCELLED',
        },
        {
          uuid: 'c',
          txParams: { from: TEST_ADDRESS_ONE },
          status: 'CANCELLED_BY_USER',
        },
        { uuid: 'd', txParams: { from: TEST_ADDRESS_ONE }, status: 'pending' },
      ];

      const pending =
        selectPendingSmartTransactionsForSelectedAccountGroup(state);

      expect(pending).toEqual(
        expect.arrayContaining([
          {
            uuid: 'a',
            txParams: { from: TEST_ADDRESS_ONE },
            status: 'SUCCESS',
            id: 'a',
            isSmartTransaction: true,
          },
          {
            uuid: 'b',
            txParams: { from: TEST_ADDRESS_ONE },
            status: 'CANCELLED',
            id: 'b',
            isSmartTransaction: true,
          },
          {
            uuid: 'c',
            txParams: { from: TEST_ADDRESS_ONE },
            status: 'CANCELLED_BY_USER',
            id: 'c',
            isSmartTransaction: true,
          },
        ]),
      );
    });
  });
});
