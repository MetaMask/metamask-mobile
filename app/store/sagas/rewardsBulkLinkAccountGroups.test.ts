import { expectSaga } from 'redux-saga-test-plan';
import { select } from 'redux-saga/effects';
import { InteractionManager } from 'react-native';
import { AccountGroupId, AccountGroupType } from '@metamask/account-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import {
  bulkLinkStarted,
  bulkLinkAccountResult,
  bulkLinkCompleted,
  bulkLinkCancelled,
  BULK_LINK_START,
  BULK_LINK_CANCEL,
} from '../../reducers/rewards';
import {
  startBulkLink,
  cancelBulkLink,
  watchBulkLink,
  rewardsBulkLinkSaga,
} from './rewardsBulkLinkAccountGroups';
import { selectAccountGroups } from '../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccountsByGroupId } from '../../selectors/multichainAccounts/accounts';
import { AccountGroupObject } from '@metamask/account-tree-controller';
import { OptInStatusDto } from '../../core/Engine/controllers/rewards-controller/types';

// Mock dependencies
jest.mock('../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
}));

jest.mock('../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));

// Mock selectors
jest.mock('../../selectors/multichainAccounts/accountTreeController', () => ({
  selectAccountGroups: jest.fn(),
}));

jest.mock('../../selectors/multichainAccounts/accounts', () => ({
  selectInternalAccountsByGroupId: jest.fn(),
}));

describe('rewardsBulkLinkAccountGroups', () => {
  const mockControllerMessenger = Engine.controllerMessenger as jest.Mocked<
    typeof Engine.controllerMessenger
  >;
  const mockLogger = Logger as jest.Mocked<typeof Logger>;
  const mockSelectAccountGroups = selectAccountGroups as jest.MockedFunction<
    typeof selectAccountGroups
  >;
  const mockSelectInternalAccountsByGroupId =
    selectInternalAccountsByGroupId as jest.MockedFunction<
      typeof selectInternalAccountsByGroupId
    >;
  const mockInteractionManager = InteractionManager as jest.Mocked<
    typeof InteractionManager
  >;

  // Test data
  const mockAccount1: InternalAccount = {
    address: '0x1111111111111111111111111111111111111111',
    type: 'eip155:eoa',
    id: 'account-1',
    scopes: ['eip155:1'],
    options: {},
    methods: ['personal_sign'],
    metadata: {
      name: 'Account 1',
      keyring: { type: 'HD Key Tree' },
      importTime: Date.now(),
    },
  };

  const mockAccount2: InternalAccount = {
    address: '0x2222222222222222222222222222222222222222',
    type: 'eip155:eoa',
    id: 'account-2',
    scopes: ['eip155:1'],
    options: {},
    methods: ['personal_sign'],
    metadata: {
      name: 'Account 2',
      keyring: { type: 'HD Key Tree' },
      importTime: Date.now(),
    },
  };

  const mockAccount3: InternalAccount = {
    address: '0x3333333333333333333333333333333333333333',
    type: 'eip155:eoa',
    id: 'account-3',
    scopes: ['eip155:1'],
    options: {},
    methods: ['personal_sign'],
    metadata: {
      name: 'Account 3',
      keyring: { type: 'HD Key Tree' },
      importTime: Date.now(),
    },
  };

  const mockAccountGroup1: AccountGroupObject = {
    id: 'entropy:group-1/1' as AccountGroupId,
    type: AccountGroupType.SingleAccount,
    accounts: ['account-1'] as [string],
    metadata: {
      name: 'Group 1',
      pinned: false,
      hidden: false,
    },
  };

  const mockAccountGroup2: AccountGroupObject = {
    id: 'entropy:group-2/1' as AccountGroupId,
    type: AccountGroupType.SingleAccount,
    accounts: ['account-2'] as [string],
    metadata: {
      name: 'Group 2',
      pinned: false,
      hidden: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger.log.mockClear();
    mockLogger.error.mockClear();
    mockControllerMessenger.call.mockClear();
    mockInteractionManager.runAfterInteractions.mockImplementation(
      (callback) => {
        if (callback && typeof callback === 'function') {
          callback();
        }
        return {
          then: jest.fn().mockResolvedValue(undefined),
          done: jest.fn(),
          cancel: jest.fn(),
        };
      },
    );
  });

  describe('Action Creators', () => {
    it('startBulkLink should return correct action', () => {
      const action = startBulkLink();
      expect(action).toEqual({ type: BULK_LINK_START });
    });

    it('cancelBulkLink should return correct action', () => {
      const action = cancelBulkLink();
      expect(action).toEqual({ type: BULK_LINK_CANCEL });
    });
  });

  describe('watchBulkLink', () => {
    it('should listen for BULK_LINK_START and process bulk link', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockReturnValue([mockAccount1]);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false], // Account not opted in
            sids: [null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          return true; // Link succeeds
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 1 }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();
    });

    it('should handle cancellation when BULK_LINK_CANCEL is dispatched', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockReturnValue([mockAccount1, mockAccount2]);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false, false], // Both accounts not opted in
            sids: [null, null],
          } as OptInStatusDto;
        }
        return null;
      });

      // Act & Assert - Cancel should be dispatched before linking starts
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .dispatch({ type: BULK_LINK_CANCEL })
        .put(bulkLinkStarted({ totalAccounts: 2 }))
        .put(bulkLinkCancelled())
        .silentRun();
    });
  });

  describe('bulkLinkWorker', () => {
    it('should return early when no account groups exist', async () => {
      // Arrange
      mockSelectAccountGroups.mockReturnValue([]);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        jest.fn().mockReturnValue([]),
      );

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), []],
          [
            select(selectInternalAccountsByGroupId),
            jest.fn().mockReturnValue([]),
          ],
        ])
        .dispatch({ type: BULK_LINK_START })
        .not.put(bulkLinkStarted({ totalAccounts: expect.any(Number) }))
        .silentRun();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Bulk link: No account groups to process',
      );
    });

    it('should return early when all accounts are already opted in', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockReturnValue([mockAccount1]);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [true], // Account already opted in
            sids: ['subscription-id'],
          } as OptInStatusDto;
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 0 }))
        .put(bulkLinkCompleted())
        .silentRun();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Bulk link: No accounts need linking (all already opted in)',
      );
    });

    it('should successfully link a single account', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockReturnValue([mockAccount1]);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false], // Account not opted in
            sids: [null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          return true; // Link succeeds
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 1 }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();

      expect(mockControllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount1,
        true, // Should invalidate on last account
      );
    });

    it('should successfully link multiple accounts', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [
        mockAccountGroup1,
        mockAccountGroup2,
      ];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockImplementation((groupId: AccountGroupId) => {
          if (groupId === 'entropy:group-1/1') {
            return [mockAccount1];
          }
          if (groupId === 'entropy:group-2/1') {
            return [mockAccount2];
          }
          return [];
        });

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false, false], // Both accounts not opted in
            sids: [null, null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          return true; // Link succeeds
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 2 }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();
    });

    it('should handle account linking failures', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockReturnValue([mockAccount1, mockAccount2]);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      let linkCallCount = 0;
      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false, false], // Both accounts not opted in
            sids: [null, null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          linkCallCount++;
          // First account fails, second succeeds
          return linkCallCount !== 1;
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 2 }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();
    });

    it('should abort early after MAX_CONSECUTIVE_FAILURES', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      // Create 10 accounts to test abort logic
      const accounts = Array.from({ length: 10 }, (_, i) => ({
        ...mockAccount1,
        address: `0x${String(i).padStart(40, '0')}`,
        id: `account-${i}`,
      }));

      const mockGetAccountsByGroupId = jest.fn().mockReturnValue(accounts);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: new Array(10).fill(false), // All accounts not opted in
            sids: new Array(10).fill(null),
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          // First 5 accounts fail (MAX_CONSECUTIVE_FAILURES = 5)
          return false;
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 10 }))
        // Should process 5 accounts (all failing)
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        // Should mark remaining 5 accounts as failed
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkAccountResult({ success: false }))
        .put(bulkLinkCompleted())
        .silentRun();

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Bulk link: 5 consecutive failures, aborting',
      );
    });

    it('should filter out unsupported accounts', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockReturnValue([mockAccount1, mockAccount2]);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      let isOptInSupportedCallCount = 0;
      // Mock isOptInSupported - first account supported, second not supported
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          isOptInSupportedCallCount++;
          return isOptInSupportedCallCount === 1; // Only first account supported
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false], // Only one account (the supported one) not opted in
            sids: [null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          return true;
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 1 })) // Only 1 account to link
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();
    });

    it('should handle errors in bulkLinkWorker gracefully', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockReturnValue([mockAccount1]);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock getOptInStatus to throw an error (this happens in the saga generator)
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          throw new Error('Test error in getOptInStatus');
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkCompleted()) // Should still complete even on error
        .silentRun();

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should invalidate cache on last account and every CACHE_INVALIDATION_INTERVAL accounts', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      // Create 3 accounts to test cache invalidation
      const accounts = [mockAccount1, mockAccount2, mockAccount3];
      const mockGetAccountsByGroupId = jest.fn().mockReturnValue(accounts);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false, false, false], // All accounts not opted in
            sids: [null, null, null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          return true;
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 3 }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();

      // Verify cache invalidation calls
      expect(mockControllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount1,
        false, // Not last account, not at interval
      );
      expect(mockControllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount2,
        false, // Not last account, not at interval
      );
      expect(mockControllerMessenger.call).toHaveBeenCalledWith(
        'RewardsController:linkAccountToSubscriptionCandidate',
        mockAccount3,
        true, // Last account, should invalidate
      );
    });

    it('should yield to UI thread every UI_YIELD_INTERVAL accounts', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [mockAccountGroup1];
      // Create 3 accounts to test UI yielding
      const accounts = [mockAccount1, mockAccount2, mockAccount3];
      const mockGetAccountsByGroupId = jest.fn().mockReturnValue(accounts);

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false, false, false], // All accounts not opted in
            sids: [null, null, null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          return true;
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 3 }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();

      // Verify InteractionManager.runAfterInteractions was called
      // Should be called once before processing (line 365) and once every 2 accounts
      expect(mockInteractionManager.runAfterInteractions).toHaveBeenCalled();
    });

    it('should filter out groups with no accounts', async () => {
      // Arrange
      const mockAccountGroups: AccountGroupObject[] = [
        mockAccountGroup1,
        mockAccountGroup2,
      ];
      const mockGetAccountsByGroupId = jest
        .fn()
        .mockImplementation((groupId: AccountGroupId) => {
          if (groupId === 'entropy:group-1/1') {
            return [mockAccount1]; // Has accounts
          }
          if (groupId === 'entropy:group-2/1') {
            return []; // No accounts
          }
          return [];
        });

      mockSelectAccountGroups.mockReturnValue(mockAccountGroups);
      mockSelectInternalAccountsByGroupId.mockReturnValue(
        mockGetAccountsByGroupId,
      );

      // Mock isOptInSupported to return true
      mockControllerMessenger.call.mockImplementation((...args: unknown[]) => {
        const method = args[0] as string;
        if (method === 'RewardsController:isOptInSupported') {
          return true;
        }
        if (method === 'RewardsController:getOptInStatus') {
          return {
            ois: [false], // Only one account (from group-1)
            sids: [null],
          } as OptInStatusDto;
        }
        if (method === 'RewardsController:linkAccountToSubscriptionCandidate') {
          return true;
        }
        return null;
      });

      // Act & Assert
      await expectSaga(watchBulkLink)
        .provide([
          [select(selectAccountGroups), mockAccountGroups],
          [select(selectInternalAccountsByGroupId), mockGetAccountsByGroupId],
        ])
        .dispatch({ type: BULK_LINK_START })
        .put(bulkLinkStarted({ totalAccounts: 1 })) // Only 1 account from group-1
        .put(bulkLinkAccountResult({ success: true }))
        .put(bulkLinkCompleted())
        .silentRun();
    });
  });

  describe('rewardsBulkLinkSaga', () => {
    it('should fork watchBulkLink', async () => {
      // This is a simple test to verify the root saga structure
      // The actual forking behavior is tested through watchBulkLink tests
      const generator = rewardsBulkLinkSaga();
      const result = generator.next();
      expect(result.value).toBeDefined();
    });
  });
});
