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
import { isSnapPreinstalled } from './utils/snaps';
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
const mockSetAccountName = jest.fn();
const mockSnapControllerHandleRequest = jest.fn();
const mockListMultichainAccounts = jest.fn();

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
      'AccountsController:listMultichainAccounts',
      'AccountsController:setAccountName',
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
      case 'AccountsController:setAccountName':
        return mockSetAccountName.mockReturnValue(null)(params);
      case 'AccountsController:listMultichainAccounts':
        return mockListMultichainAccounts.mockReturnValue([])();
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

// Mock the isMultichainAccountsState2Enabled function
const mockIsMultichainAccountsState2Enabled = jest.fn();
jest.mock('../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: () =>
    mockIsMultichainAccountsState2Enabled(),
}));

describe('Snap Keyring Methods', () => {
  beforeEach(() => {
    mockIsMultichainAccountsState2Enabled.mockReturnValue(false);
  });

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
      mockAddRequest.mockReturnValue(true).mockReturnValue({ success: true });
      (isSnapPreinstalled as jest.Mock).mockReset();
    });
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('handles account creation with without a user defined name', async () => {
      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
        },
      });

      expect(mockStartFlow).toHaveBeenCalledTimes(2);
      expect(mockAddRequest).toHaveBeenNthCalledWith(1, [
        {
          origin: mockSnapId,
          type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
          requestData: {
            snapSuggestedAccountName: '',
          },
        },
        true,
      ]);
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);
      expect(mockGetAccounts).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);

      // Wait for any pending promises (including the account finalization which tracks the event)
      await waitForAllPromises();

      // Verify that setSelectedAccount is called but setAccountName is not called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).not.toHaveBeenCalled();

      // Verify trackSnapAccountEvent was called for successful account creation
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('handles account creation with user defined name', async () => {
      const mockNameSuggestion = 'suggested name';
      mockAddRequest.mockReturnValueOnce({
        success: true,
        name: mockNameSuggestion,
      });
      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          accountNameSuggestion: mockNameSuggestion,
        },
      });

      expect(mockStartFlow).toHaveBeenCalledTimes(2);
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);
      expect(mockAddRequest).toHaveBeenNthCalledWith(1, [
        {
          origin: mockSnapId,
          type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
          requestData: {
            snapSuggestedAccountName: mockNameSuggestion,
          },
        },
        true,
      ]);
      expect(mockGetAccounts).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization which tracks the event)
      await waitForAllPromises();

      // Verify that setSelectedAccount and setAccountName are called separately
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);
      expect(mockEndFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);

      // Verify trackSnapAccountEvent was called
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('handles account creation without using user defined name - state 2', async () => {
      // Enable state 2 feature flag
      mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

      const mockNameSuggestion = "suggested name that won't be used";
      mockAddRequest.mockReturnValueOnce({
        success: true,
        name: mockNameSuggestion,
      });
      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          accountNameSuggestion: mockNameSuggestion,
        },
      });

      // Wait for any pending promises (including the account finalization which tracks the event)
      await waitForAllPromises();

      // Verify that setAccountName is not called since state 2 auto handles it
      expect(mockStartFlow).toHaveBeenCalled();
      expect(mockSetAccountName).not.toHaveBeenCalled();
      expect(mockEndFlow).toHaveBeenCalled();
    });

    it('throws an error when user denies account creation', async () => {
      // Mock the addRequest to return success: false to simulate user denial
      mockAddRequest.mockReturnValueOnce({
        success: false,
      });

      const builder = createSnapKeyringBuilder();

      // We expect the handleKeyringSnapMessage to throw an error
      await expect(
        builder().handleKeyringSnapMessage(mockSnapId, {
          method: KeyringEvent.AccountCreated,
          params: {
            account: mockAccount,
            displayConfirmation: false,
          },
        }),
      ).rejects.toThrow('User denied account creation');

      // Verify that the approval flow was started and ended
      expect(mockStartFlow).toHaveBeenCalledTimes(1);
      expect(mockAddRequest).toHaveBeenCalledTimes(1);
      expect(mockAddRequest).toHaveBeenCalledWith([
        {
          origin: mockSnapId,
          type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
          requestData: {
            snapSuggestedAccountName: '',
          },
        },
        true,
      ]);

      // Verify that the handleUserInput callback was called with false
      expect(mockSnapControllerHandleRequest).not.toHaveBeenCalled();

      // Verify that the persistKeyringHelper was not called
      expect(mockPersisKeyringHelper).not.toHaveBeenCalled();

      // Verify that the flow was ended
      expect(mockEndFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);
    });

    it('ends approval flow on error', async () => {
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

      // ! This no longer throws an error, but instead, we log it. Since this part
      // ! of the flow is not awaited, so we await for it explicitly here:
      await waitForAllPromises();
      expect(loggerSpy).toHaveBeenCalledWith(
        new Error('save error'),
        'Error occurred while creating snap account',
      );

      expect(mockStartFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenNthCalledWith(1, [{ id: mockFlowId }]);
      expect(mockEndFlow).toHaveBeenNthCalledWith(2, [{ id: mockFlowId }]);
      expect(trackSnapAccountEvent).not.toHaveBeenCalled();
    });
    it('skips account name suggestion dialog for preinstalled snaps when displayAccountNameSuggestion is false', async () => {
      // Mock isSnapPreinstalled to return true for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'auto generated name';
      mockListMultichainAccounts.mockReturnValueOnce([]);

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

      // Verify the account name suggestion dialog was not shown
      expect(mockAddRequest).not.toHaveBeenCalledWith([
        {
          origin: mockSnapId,
          type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
          requestData: {
            snapSuggestedAccountName: mockNameSuggestion,
          },
        },
        true,
      ]);

      // Verify that listMultichainAccounts was called to generate a unique name
      expect(mockListMultichainAccounts).toHaveBeenCalledTimes(1);

      // Verify that the account was created and named
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Verify that setSelectedAccount and setAccountName are called separately
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);
    });

    it('shows account name suggestion dialog for preinstalled snaps when displayAccountNameSuggestion is true', async () => {
      // Mock isSnapPreinstalled to return true for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'suggested name';

      // Set up mockAddRequest to return success with the name
      mockAddRequest.mockReturnValueOnce({
        success: true,
        name: mockNameSuggestion,
      });

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: true, // This should trigger skipConfirmation=false
          accountNameSuggestion: mockNameSuggestion,
          displayAccountNameSuggestion: true, // This should trigger the dialog
        },
      });

      // Verify that the approval flow was started
      expect(mockStartFlow).toHaveBeenCalledTimes(2);

      // Verify that the account was created and named
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Verify that setSelectedAccount and setAccountName are called separately
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);

      // Verify that the approval flow was ended
      expect(mockEndFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenNthCalledWith(1, [{ id: mockFlowId }]);
      expect(mockEndFlow).toHaveBeenNthCalledWith(2, [{ id: mockFlowId }]);
    });

    it('always shows account name suggestion dialog for non-preinstalled snaps regardless of displayAccountNameSuggestion', async () => {
      // Mock isSnapPreinstalled to return false for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(false);

      const mockNameSuggestion = 'suggested name';
      mockAddRequest.mockReturnValueOnce({
        success: true,
        name: mockNameSuggestion,
      });

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false,
          accountNameSuggestion: mockNameSuggestion,
          displayAccountNameSuggestion: false, // Even though this is false, dialog should show for non-preinstalled snaps
        },
      });

      // Verify the account name suggestion dialog was shown
      expect(mockAddRequest).toHaveBeenCalledWith([
        {
          origin: mockSnapId,
          type: SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES.showNameSnapAccount,
          requestData: {
            snapSuggestedAccountName: mockNameSuggestion,
          },
        },
        true,
      ]);

      // Verify that the account was created and named
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Verify that setSelectedAccount and setAccountName are called separately
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);
    });

    it('always sets selected account for both preinstalled and non-preinstalled snaps with default options', async () => {
      // Test with preinstalled snap first
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'suggested name';
      mockAddRequest.mockReturnValueOnce({
        success: true,
        name: mockNameSuggestion,
      });

      const builder = createSnapKeyringBuilder();
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

      // Verify that both setSelectedAccount and setAccountName are called for preinstalled snap
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);

      // Reset mocks for second test and set them up again
      mockSetSelectedAccount.mockReset();
      mockSetAccountName.mockReset();
      mockAddRequest.mockReset();
      mockPersisKeyringHelper.mockReset();
      mockStartFlow.mockReset();
      mockEndFlow.mockReset();
      mockGetAccounts.mockReset();

      // Set up mocks for second test
      mockAddRequest.mockReturnValueOnce({
        success: true,
        name: mockNameSuggestion,
      });
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

      // Verify that both setSelectedAccount and setAccountName are called for non-preinstalled snap too
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);
    });

    it('skips startFlow when skipConfirmation is true for preinstalled snaps', async () => {
      // Mock isSnapPreinstalled to return true for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'suggested name';
      mockListMultichainAccounts.mockReturnValueOnce([]);

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: false, // This should trigger skipApprovalFlow=true
          displayAccountNameSuggestion: false, // This should trigger skipAccountNameSuggestionDialog=true
          accountNameSuggestion: mockNameSuggestion,
        },
      });

      // Verify that startFlow was NOT called during account creation
      expect(mockStartFlow).not.toHaveBeenCalled();

      // Verify that the account was created and named
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Verify that setSelectedAccount and setAccountName are called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);

      // Verify trackSnapAccountEvent was called
      expect(trackSnapAccountEvent).toHaveBeenCalled();
    });

    it('calls startFlow when skipConfirmation is false for preinstalled snaps', async () => {
      // Mock isSnapPreinstalled to return true for this test
      (isSnapPreinstalled as jest.Mock).mockReturnValue(true);

      const mockNameSuggestion = 'suggested name';
      mockAddRequest.mockReturnValueOnce({
        success: true,
        name: mockNameSuggestion,
      });

      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: true, // This should trigger skipConfirmation=false
          accountNameSuggestion: mockNameSuggestion,
        },
      });

      // Verify that startFlow was called during account creation
      expect(mockStartFlow).toHaveBeenCalledTimes(2);

      // Verify that the account was created and named
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(1);

      // Wait for any pending promises (including the account finalization)
      await waitForAllPromises();

      // Verify that setSelectedAccount and setAccountName are called
      expect(mockSetSelectedAccount).toHaveBeenCalledTimes(1);
      expect(mockSetSelectedAccount).toHaveBeenCalledWith([mockAccount.id]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);

      // Verify that the approval flow was ended
      expect(mockEndFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenNthCalledWith(1, [{ id: mockFlowId }]);
      expect(mockEndFlow).toHaveBeenNthCalledWith(2, [{ id: mockFlowId }]);

      // Verify trackSnapAccountEvent was called
      expect(trackSnapAccountEvent).toHaveBeenCalled();
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
