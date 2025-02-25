import { Messenger } from '@metamask/base-controller';
import { EthAccountType, EthScope, KeyringEvent } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { snapKeyringBuilder } from './SnapKeyring';
import {
  SnapKeyringBuilderAllowActions,
  SnapKeyringBuilderMessenger,
} from './types';
import { SnapId } from '@metamask/snaps-sdk';
import { SNAP_MANAGE_ACCOUNTS_CONFIRMATION_TYPES } from '../RPCMethods/RPCMethodMiddleware';

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
    name: 'SnapKeyringBuilder',
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
      default:
        throw new Error(
          `MOCK_FAIL - unsupported messenger call: ${actionType}`,
        );
    }
  });

  return messenger;
};

const createSnapKeyringBuilder = () =>
  snapKeyringBuilder(createControllerMessenger(), {
    persistKeyringHelper: mockPersisKeyringHelper,
    removeAccountHelper: mockRemoveAccountHelper,
  });

describe('Snap Keyring Methods', () => {
  afterEach(() => {
    jest.resetAllMocks();
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

      expect(mockStartFlow).toHaveBeenCalledTimes(1);
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
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(2);
      expect(mockGetAccountByAddress).toHaveBeenCalledTimes(1);
      expect(mockGetAccountByAddress).toHaveBeenCalledWith([
        mockAccount.address.toLowerCase(),
      ]);
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

      expect(mockStartFlow).toHaveBeenCalledTimes(1);
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(2);
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
      expect(mockGetAccountByAddress).toHaveBeenCalledTimes(1);
      expect(mockGetAccountByAddress).toHaveBeenCalledWith([
        mockAccount.address.toLowerCase(),
      ]);
      expect(mockSetAccountName).toHaveBeenCalledTimes(1);
      expect(mockSetAccountName).toHaveBeenCalledWith([
        mockAccount.id,
        mockNameSuggestion,
      ]);
      expect(mockEndFlow).toHaveBeenCalledTimes(1);
      expect(mockEndFlow).toHaveBeenCalledWith([{ id: mockFlowId }]);
    });
  });
});
