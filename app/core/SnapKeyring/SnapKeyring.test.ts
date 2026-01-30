import {
  Messenger,
  type MockAnyNamespace,
  MOCK_ANY_NAMESPACE,
} from '@metamask/messenger';
import {
  EthAccountType,
  EthScope,
  KeyringEvent,
  KeyringRpcMethod,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { snapKeyringBuilder } from './SnapKeyring';
import {
  SnapKeyringBuilderAllowActions,
  SnapKeyringBuilderMessenger,
} from './types';
import { SnapId } from '@metamask/snaps-sdk';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../RPCMethods/RPCMethodMiddleware';
import { showAccountNameSuggestionDialog } from './utils/showDialog';
import Logger from '../../util/Logger';
import { isSnapPreinstalled, isMultichainWalletSnap } from './utils/snaps';
import { trackSnapAccountEvent } from '../Analytics/helpers/SnapKeyring/trackSnapAccountEvent';

const mockAddRequest = jest.fn();
const mockStartFlow = jest.fn();
const mockEndFlow = jest.fn();
const mockGetAccounts = jest.fn();
const mockSnapId: SnapId = 'npm:@metamask/solana-wallet-snap' as SnapId;
const mockSnapName = 'mock-snap';
const mockPersisKeyringHelper = jest.fn();
const mockSetSelectedAccount = jest.fn();
const mockRemoveAccountHelper = jest.fn();
const mockGetAccountByAddress = jest.fn();
const mockSnapControllerHandleRequest = jest.fn();

const mockFlowId = '123';
const address = '0x2a4d4b667D5f12C3F9Bf8F14a7B9f8D8d9b8c8fA';
const accountNameSuggestion = 'Suggested Account Name';

const mockAccount = {
  type: EthAccountType.Eoa,
  id: '3afa663e-0600-4d93-868a-61c2e553013b',
  address,
  methods: [],
  options: {},
};
const mockInternalAccount: InternalAccount = {
  ...mockAccount,
  scopes: [EthScope.Eoa],
  metadata: {
    snap: {
      enabled: true,
      id: mockSnapId,
      name: mockSnapName,
    },
    name: accountNameSuggestion,
    keyring: {
      type: '',
    },
    importTime: 0,
  },
};

type RootMessenger = Messenger<
  MockAnyNamespace,
  SnapKeyringBuilderAllowActions,
  never
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

const createControllerMessenger = ({
  account = mockInternalAccount,
}: {
  account?: InternalAccount;
} = {}): SnapKeyringBuilderMessenger => {
  const rootMessenger = getRootMessenger();
  const messenger = new Messenger<
    'SnapKeyring',
    SnapKeyringBuilderAllowActions,
    never,
    typeof rootMessenger
  >({
    namespace: 'SnapKeyring',
    parent: rootMessenger,
  });
  rootMessenger.delegate({
    actions: [
      'ApprovalController:addRequest',
      'ApprovalController:acceptRequest',
      'ApprovalController:rejectRequest',
      'ApprovalController:startFlow',
      'ApprovalController:endFlow',
      'ApprovalController:showSuccess',
      'ApprovalController:showError',
      'PhishingController:maybeUpdateState',
      'KeyringController:getAccounts',
      'AccountsController:setSelectedAccount',
      'AccountsController:getAccountByAddress',
    ],
    events: [],
    messenger,
  });

  jest.spyOn(messenger, 'call').mockImplementation((...args) => {
    // This mock implementation does not have a nice discriminate union where types/parameters can be correctly inferred
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [actionType, ...params]: any[] = args;

    switch (actionType) {
      case 'ApprovalController:startFlow':
        return mockStartFlow.mockReturnValue({ id: mockFlowId })();
      case 'ApprovalController:addRequest':
        return mockAddRequest(params);
      case 'ApprovalController:endFlow':
        return mockEndFlow.mockReturnValue(true)(params);
      case 'KeyringController:getAccounts':
        return mockGetAccounts.mockResolvedValue([])();
      case 'AccountsController:getAccountByAddress':
        return mockGetAccountByAddress.mockReturnValue(account)(params);
      case 'AccountsController:setSelectedAccount':
        return mockSetSelectedAccount(params);
      case 'SnapController:handleRequest':
        return mockSnapControllerHandleRequest(params);
      default:
        throw new Error(
          `MOCK_FAIL - unsupported messenger call: ${actionType}`,
        );
    }
  });

  return messenger;
};

/**
 * Utility function that waits for all pending promises to be resolved.
 * This is necessary when testing asynchronous execution flows that are
 * initiated by synchronous calls.
 *
 * @returns A promise that resolves when all pending promises are completed.
 */
async function waitForAllPromises(): Promise<void> {
  // Wait for next tick to flush all pending promises. It's requires since
  // we are testing some asynchronous execution flows that are started by
  // synchronous calls.
  await new Promise(process.nextTick);
}

const createSnapKeyringBuilder = () =>
  snapKeyringBuilder(createControllerMessenger(), {
    persistKeyringHelper: mockPersisKeyringHelper,
    removeAccountHelper: mockRemoveAccountHelper,
  });

// Mock the isSnapPreinstalled function
jest.mock('./utils/snaps', () => ({
  isSnapPreinstalled: jest.fn(),
  isMultichainWalletSnap: jest.fn().mockReturnValue(false),
  getSnapName: jest.fn().mockReturnValue('Mock Snap Name'),
}));

// Mock the trackSnapAccountEvent function
jest.mock('../Analytics/helpers/SnapKeyring/trackSnapAccountEvent', () => ({
  trackSnapAccountEvent: jest.fn(),
}));

describe('Snap Keyring Methods', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('helpers', () => {
    describe('showAccountNameSuggestionDialog', () => {
      it('shows account name suggestion dialog and return true on user confirmation', async () => {
        const controllerMessenger = createControllerMessenger();
        controllerMessenger.call('ApprovalController:startFlow');

        await showAccountNameSuggestionDialog(
          mockSnapId,
          controllerMessenger,
          accountNameSuggestion,
        );

        expect(mockAddRequest).toHaveBeenCalledTimes(1);
        expect(mockAddRequest).toHaveBeenCalledWith([
          {
            origin: mockSnapId,
            type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
            requestData: {
              snapSuggestedAccountName: accountNameSuggestion,
            },
          },
          true,
        ]);
      });
    });
  });

  describe('addAccount', () => {
    beforeEach(() => {
      // The SnapKeyring library may still call approval requests internally
      mockAddRequest.mockResolvedValue({ success: true });
      (isSnapPreinstalled as jest.Mock).mockReset();
      (isMultichainWalletSnap as jest.Mock).mockReturnValue(false);
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('handles account creation for non-preinstalled snap', async () => {
      // Non-preinstalled snaps use the approval flow in addAccountFinalize
      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
        },
      });

      // The implementation auto-approves and calls addAccountFinalize
      // which uses an approval flow for non-preinstalled snaps
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);
      expect(mockGetAccounts).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization which tracks the event)
      await waitForAllPromises();

      // Verify that setSelectedAccount is called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);

      // Verify approval flow was used (startFlow and endFlow called)
      expect(mockStartFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);

      // Verify trackSnapAccountEvent was called for successful account creation
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('handles account creation with account name suggestion (ignored in BIP-44)', async () => {
      // Account name suggestions are no longer processed - naming is handled by multichain account groups
      const mockNameSuggestion = 'suggested name';
      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          accountNameSuggestion: mockNameSuggestion,
        },
      });

      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);
      expect(mockGetAccounts).toHaveBeenCalledTimes(1);

      // Wait for any pending promises
      await waitForAllPromises();

      // Verify that setSelectedAccount is called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);

      // Verify approval flow was used
      expect(mockStartFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);

      // Verify trackSnapAccountEvent was called
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('ends approval flow on error during save', async () => {
      const loggerSpy = jest.spyOn(Logger, 'error').mockImplementation();

      const errorMessage = 'save error';
      mockPersisKeyringHelper.mockRejectedValue(new Error(errorMessage));
      mockSnapControllerHandleRequest.mockImplementation((params) => {
        expect(params).toStrictEqual([
          {
            snapId: mockSnapId,
            origin: 'metamask',
            handler: 'onKeyringRequest',
            request: {
              jsonrpc: '2.0',
              id: expect.any(String),
              method: KeyringRpcMethod.DeleteAccount,
              params: {
                id: mockAccount.id,
              },
            },
          },
        ]);

        // We must return `null` when removing an account.
        return null;
      });
      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
        },
      });

      // This no longer throws an error, but instead, we log it. Since this part
      // of the flow is not awaited, so we await for it explicitly here:
      await waitForAllPromises();
      expect(loggerSpy).toHaveBeenCalledWith(
        new Error('save error'),
        'Error occurred while creating snap account',
      );

      // Approval flow should still be properly ended even on error
      expect(mockStartFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);
      expect(trackSnapAccountEvent).not.toHaveBeenCalled();
    });

    it('skips approval flow for preinstalled snaps when both confirmations are disabled', async () => {
      // Mock isSnapPreinstalled to return true for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'auto generated name';

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          accountNameSuggestion: mockNameSuggestion,
          displayAccountNameSuggestion: false,
        },
      });

      // Verify that the account was created
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // When both confirmations are disabled for preinstalled snaps,
      // skipApprovalFlow is true, so no approval flow is used
      expect(mockStartFlow).not.toHaveBeenCalled();
      expect(mockEndFlow).not.toHaveBeenCalled();

      // Verify that setSelectedAccount is called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);

      // Verify trackSnapAccountEvent was called
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('skips all dialogs for preinstalled multichain wallet snaps', async () => {
      // Mock isSnapPreinstalled and isMultichainWalletSnap to return true
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);
      (isMultichainWalletSnap as jest.Mock).mockReturnValue(true);

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: true, // Even with true, should skip for multichain wallet snaps
          accountNameSuggestion: 'some name',
          displayAccountNameSuggestion: true,
        },
      });

      // Verify that the account was created
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises
      await waitForAllPromises();

      // For preinstalled multichain wallet snaps, skipAll=true, so no approval flow
      expect(mockStartFlow).not.toHaveBeenCalled();
      expect(mockEndFlow).not.toHaveBeenCalled();

      // setSelectedAccount should NOT be called because skipSetSelectedAccountStep=true
      expect(mockSetSelectedAccount).not.toHaveBeenCalled();

      // Verify trackSnapAccountEvent was called
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('uses approval flow for preinstalled snaps when confirmations are enabled', async () => {
      // Mock isSnapPreinstalled to return true for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'suggested name';

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: true,
          accountNameSuggestion: mockNameSuggestion,
          displayAccountNameSuggestion: true,
        },
      });

      // Verify that the account was created
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // When confirmations are enabled, approval flow is used
      expect(mockStartFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);

      // Verify that setSelectedAccount is called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
    });

    it('always uses approval flow for non-preinstalled snaps', async () => {
      // Mock isSnapPreinstalled to return false for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(false);

      const mockNameSuggestion = 'suggested name';

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          accountNameSuggestion: mockNameSuggestion,
          displayAccountNameSuggestion: false,
        },
      });

      // Verify that the account was created
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Non-preinstalled snaps always use approval flow
      expect(mockStartFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledTimes(1);

      // Verify that setSelectedAccount is called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
    });

    it('sets selected account for both preinstalled and non-preinstalled snaps', async () => {
      // Test with preinstalled snap first (with confirmations disabled to skip approval flow)
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'suggested name';

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          displayAccountNameSuggestion: false,
          accountNameSuggestion: mockNameSuggestion,
        },
      });

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Verify that setSelectedAccount is called for preinstalled snap
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);

      // Reset mocks for second test and set them up again
      mockSetSelectedAccount.mockReset();
      mockPersisKeyringHelper.mockReset();
      mockStartFlow.mockReset();
      mockEndFlow.mockReset();
      mockGetAccounts.mockReset();

      // Set up mocks for second test
      mockStartFlow.mockReturnValue({ id: mockFlowId });
      mockEndFlow.mockReturnValue(true);
      mockGetAccounts.mockResolvedValue([]);

      // Test with non-preinstalled snap
      (isSnapPreinstalled as jest.Mock).mockReturnValue(false);

      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          accountNameSuggestion: mockNameSuggestion,
        },
      });

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Verify that setSelectedAccount is called for non-preinstalled snap too
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
    });
  });

  describe('removeAccount', () => {
    beforeEach(() => {
      mockAddRequest.mockReturnValue(true).mockReturnValue({ success: true });
      (isSnapPreinstalled as jest.Mock).mockReset();
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('calls removeAccountHelper and persistKeyringHelper when account is deleted', async () => {
      const builder = createSnapKeyringBuilder();
      const snapKeyring = builder();

      // First add an account to the keyring so that it can be removed
      // NOTE: This callback will not be triggered if there are no accounts in the keyring
      await snapKeyring.handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
        },
      });

      // Reset mocks after account creation
      mockRemoveAccountHelper.mockReset();
      mockPersisKeyringHelper.mockReset();

      // Now delete the account
      await snapKeyring.handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountDeleted,
        params: {
          id: mockAccount.id,
        },
      });

      expect(mockRemoveAccountHelper).toHaveBeenCalledTimes(1);
      expect(mockRemoveAccountHelper).toHaveBeenCalledWith(
        mockAccount.address.toLowerCase(),
      );
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(2);

      // Verify trackSnapAccountEvent was called
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('handles errors when removing an account', async () => {
      const loggerSpy = jest.spyOn(Logger, 'error').mockImplementation();

      // Set up mock to throw an error
      const errorMessage = 'Failed to remove account';
      mockRemoveAccountHelper.mockRejectedValue(new Error(errorMessage));

      const builder = createSnapKeyringBuilder();
      const snapKeyring = builder();

      // First add an account to the keyring so that it can be removed
      await snapKeyring.handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
        },
      });

      // Reset mocks after account creation
      mockRemoveAccountHelper.mockReset();
      mockPersisKeyringHelper.mockReset();
      mockRemoveAccountHelper.mockRejectedValue(new Error(errorMessage));

      // Expect the error to be thrown
      await expect(
        snapKeyring.handleKeyringSnapMessage(mockSnapId, {
          method: KeyringEvent.AccountDeleted,
          params: {
            id: mockAccount.id,
          },
        }),
      ).rejects.toThrow(errorMessage);

      // Verify error was logged
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: errorMessage }),
        expect.stringContaining(
          `Error removing snap account: ${mockAccount.address.toLowerCase()}`,
        ),
      );

      // Verify trackSnapAccountEvent was called for error case
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });
  });
});
