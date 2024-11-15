import { ControllerMessenger } from '@metamask/base-controller';
import {
  EthAccountType,
  InternalAccount,
  KeyringEvent,
} from '@metamask/keyring-api';
import { snapKeyringBuilder } from './SnapKeyring';
import {
  SnapKeyringBuilderAllowActions,
  SnapKeyringBuilderMessenger,
} from './types';
import { SnapId } from '@metamask/snaps-sdk';

const mockGetAccounts = jest.fn();
const mockSnapId: SnapId = 'snapId' as SnapId;
const mockSnapName = 'mock-snap';
const mockSnapController = jest.fn();
const mockPersisKeyringHelper = jest.fn();
const mockSetSelectedAccount = jest.fn();
const mockRemoveAccountHelper = jest.fn();
const mockGetAccountByAddress = jest.fn();

const address = '0x2a4d4b667D5f12C3F9Bf8F14a7B9f8D8d9b8c8fA';
const accountNameSuggestion = 'Suggested Account Name';
const mockAccount = {
  type: EthAccountType.Eoa,
  id: '3afa663e-0600-4d93-868a-61c2e553013b',
  address,
  methods: [],
  options: {},
};
const mockInternalAccount = {
  ...mockAccount,
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
  const messenger = new ControllerMessenger<
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
      case 'KeyringController:getAccounts':
        return mockGetAccounts.mockResolvedValue([])();

      case 'AccountsController:getAccountByAddress':
        return mockGetAccountByAddress.mockReturnValue(account)(params);

      case 'AccountsController:setSelectedAccount':
        return mockSetSelectedAccount(params);

      default:
        throw new Error(
          `MOCK_FAIL - unsupported messenger call: ${actionType}`,
        );
    }
  });

  return messenger;
};

const createSnapKeyringBuilder = () =>
  snapKeyringBuilder(
    createControllerMessenger(),
    mockSnapController,
    mockPersisKeyringHelper,
    mockRemoveAccountHelper,
  );

describe('Snap Keyring Methods', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('addAccount', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('handles account creation with without a user defined name', async () => {
      const builder = createSnapKeyringBuilder();
      await builder().handleKeyringSnapMessage(mockSnapId, {
        method: KeyringEvent.AccountCreated,
        params: {
          account: mockAccount,
          displayConfirmation: true,
        },
      });
      expect(mockPersisKeyringHelper).toHaveBeenCalledTimes(2);
      expect(mockGetAccountByAddress).toHaveBeenCalledTimes(1);
      expect(mockGetAccountByAddress).toHaveBeenCalledWith([
        mockAccount.address.toLowerCase(),
      ]);
    });
  });
});
