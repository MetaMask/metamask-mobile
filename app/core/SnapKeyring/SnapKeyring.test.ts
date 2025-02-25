import { Messenger } from '@metamask/base-controller';
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

const createControllerMessenger = ({
  account = mockInternalAccount,
}: {
  account?: InternalAccount;
} = {}): SnapKeyringBuilderMessenger => {
  const messenger = new Messenger<
    SnapKeyringBuilderAllowActions,
    never
  >().getRestricted({
    name: 'SnapKeyring',
    allowedActions: [
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
    allowedEvents: [],
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
      mockAddRequest.mockReturnValue(true).mockReturnValue({ success: true });
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
      expect(mockSetAccountName).not.toHaveBeenCalled();
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);
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
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);
      expect(mockEndFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);
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
      const consoleSpy = jest.spyOn(console, 'error');

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
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error occurred while creating snap account:',
        errorMessage,
      );

      expect(mockStartFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenCalledTimes(2);
      expect(mockEndFlow).toHaveBeenNthCalledWith(1, [{ id: mockFlowId }]);
      expect(mockEndFlow).toHaveBeenNthCalledWith(2, [{ id: mockFlowId }]);
    });
  });
});
