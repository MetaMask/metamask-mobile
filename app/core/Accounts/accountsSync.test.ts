import {
  AccountsController,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import {
  PreferencesController,
  PreferencesState,
} from '@metamask/preferences-controller';
import { syncSelectedAddress, syncAccountName } from './accountsSync';

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';
const MOCK_ADDRESS_1 = '0x1234567890abcdef1234567890abcdef12345678';
const MOCK_ADDRESS_1_CHECKSUMMED = toChecksumHexAddress(MOCK_ADDRESS_1);

const mockAccountsControllerState: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      '30313233-3435-4637-b839-383736353430': {
        address: MOCK_ADDRESS,
        id: '30313233-3435-4637-b839-383736353430',
        options: {},
        metadata: {
          name: 'Account 1',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
      },
    },
    selectedAccount: '30313233-3435-4637-b839-383736353430',
  },
};

describe('syncSelectedAddress', () => {
  it('should update the selected address if different', () => {
    const preferencesState: PreferencesState = {
      identities: {
        [MOCK_ADDRESS]: {
          address: MOCK_ADDRESS,
          name: 'Account 1',
        },
        [MOCK_ADDRESS_1]: {
          address: MOCK_ADDRESS_1,
          name: 'New Account',
        },
      },
      selectedAddress: MOCK_ADDRESS_1,
    } as any;

    const mockAccountsController = {
      state: mockAccountsControllerState,
      getAccountByAddress: jest
        .fn()
        .mockReturnValue({ id: 'account-2', address: MOCK_ADDRESS_1 }),
      setSelectedAccount: jest.fn(),
    } as unknown as AccountsController;

    const mockPreferencesController = {
      setSelectedAddress: jest.fn(),
    } as unknown as PreferencesController;

    syncSelectedAddress(
      preferencesState,
      () => mockAccountsController,
      () => mockPreferencesController,
    );

    expect(mockAccountsController.setSelectedAccount).toHaveBeenCalledWith(
      'account-2',
    );
    expect(mockPreferencesController.setSelectedAddress).toHaveBeenCalledWith(
      MOCK_ADDRESS_1,
    );
  });

  it('should not update the selected address if the same', () => {
    const preferencesState: PreferencesState = {
      identities: {
        [MOCK_ADDRESS]: {
          address: MOCK_ADDRESS,
          name: 'Account 1',
        },
      },
      selectedAddress: MOCK_ADDRESS,
    } as any;

    const mockAccountsController = {
      state: mockAccountsControllerState,
      getAccountByAddress: jest.fn(),
      setSelectedAccount: jest.fn(),
    } as unknown as AccountsController;

    const mockPreferencesController = {
      setSelectedAddress: jest.fn(),
    } as unknown as PreferencesController;

    syncSelectedAddress(
      preferencesState,
      () => mockAccountsController,
      () => mockPreferencesController,
    );

    expect(mockAccountsController.setSelectedAccount).not.toHaveBeenCalled();
    expect(mockPreferencesController.setSelectedAddress).not.toHaveBeenCalled();
  });

  it('should throw an error if the account is not found', () => {
    const preferencesState: PreferencesState = {
      identities: {
        [MOCK_ADDRESS]: {
          address: MOCK_ADDRESS,
          name: 'Account 1',
        },
      },
      selectedAddress: MOCK_ADDRESS_1,
    } as any;

    const mockAccountsController = {
      state: mockAccountsControllerState,
      getAccountByAddress: jest.fn().mockReturnValue(undefined),
      setSelectedAccount: jest.fn(),
    } as unknown as AccountsController;

    const mockPreferencesController = {
      setSelectedAddress: jest.fn(),
    } as unknown as PreferencesController;

    expect(() => {
      syncSelectedAddress(
        preferencesState,
        () => mockAccountsController,
        () => mockPreferencesController,
      );
    }).toThrow(`Account not found for address: ${MOCK_ADDRESS_1_CHECKSUMMED}`);
  });
});

describe('syncAccountName', () => {
  it('should update the account name if different', () => {
    const preferencesState: PreferencesState = {
      identities: {
        [MOCK_ADDRESS]: {
          address: MOCK_ADDRESS,
          name: 'New Name',
        },
      },
    } as any;

    const mockAccountsController = {
      state: mockAccountsControllerState,
      setAccountName: jest.fn(),
    } as unknown as AccountsController;

    syncAccountName(preferencesState, () => mockAccountsController);

    expect(mockAccountsController.setAccountName).toHaveBeenCalledWith(
      '30313233-3435-4637-b839-383736353430',
      'New Name',
    );
  });

  it('should not update the account name if the same', () => {
    const preferencesState: PreferencesState = {
      identities: {
        [MOCK_ADDRESS]: {
          address: MOCK_ADDRESS,
          name: 'Account 1',
        },
      },
    } as any;

    const mockAccountsController = {
      state: mockAccountsControllerState,
      setAccountName: jest.fn(),
    } as unknown as AccountsController;

    syncAccountName(preferencesState, () => mockAccountsController);

    expect(mockAccountsController.setAccountName).not.toHaveBeenCalled();
  });

  it('should handle lowercase and checksummed addresses correctly', () => {
    const preferencesState: PreferencesState = {
      identities: {
        [MOCK_ADDRESS]: {
          address: MOCK_ADDRESS,
          name: 'New Name',
        },
      },
    } as any;

    const mockAccountsController = {
      state: mockAccountsControllerState,
      setAccountName: jest.fn(),
    } as unknown as AccountsController;

    syncAccountName(preferencesState, () => mockAccountsController);

    expect(mockAccountsController.setAccountName).toHaveBeenCalledWith(
      '30313233-3435-4637-b839-383736353430',
      'New Name',
    );
  });
});
