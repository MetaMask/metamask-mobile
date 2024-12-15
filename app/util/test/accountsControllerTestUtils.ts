import { v4 as uuidV4 } from 'uuid';
import {
  EthAccountType,
  EthMethod,
  InternalAccount,
  KeyringAccountType,
} from '@metamask/keyring-api';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  mockQrKeyringAddress,
  mockSimpleKeyringAddress,
  mockSnapAddress1,
  mockSnapAddress2,
} from './keyringControllerTestUtils';

export function createMockUuidFromAddress(address: string): string {
  const fakeShaFromAddress = Array.from(
    { length: 16 },
    (_, i) => address.charCodeAt(i) || 0,
  );
  return uuidV4({
    random: fakeShaFromAddress,
  });
}

export function createMockInternalAccount(
  address: string,
  nickname: string,
  keyringType: KeyringTypes = KeyringTypes.hd,
  accountType: KeyringAccountType = EthAccountType.Eoa,
): InternalAccount {
  const genericMetadata = {
    name: nickname,
    importTime: 1684232000456,
    keyring: {
      type: keyringType,
    },
  };
  const snapMetadata = {
    name: nickname,
    importTime: 1684232000456,
    keyring: {
      type: KeyringTypes.snap,
    },
    snap: {
      id: 'snap-id',
      enabled: true,
    },
  };
  return {
    address,
    id: createMockUuidFromAddress(address),
    metadata:
      keyringType === KeyringTypes.snap ? snapMetadata : genericMetadata,
    options: {},
    methods: [
      EthMethod.PersonalSign,
      EthMethod.SignTransaction,
      EthMethod.SignTypedDataV1,
      EthMethod.SignTypedDataV3,
      EthMethod.SignTypedDataV4,
    ],
    type: accountType,
  };
}

export function createMockSnapInternalAccount(
  address: string,
  nickname: string,
): InternalAccount {
  return {
    address,
    id: createMockUuidFromAddress(address),
    metadata: {
      name: nickname,
      importTime: 1684232000456,
      keyring: {
        type: 'Snap Keyring',
      },
      snap: {
        id: 'npm:@metamask/snap-simple-keyring-snap',
        name: 'MetaMask Simple Snap Keyring',
        enabled: true,
      },
    },
    options: {},
    methods: [
      EthMethod.PersonalSign,
      EthMethod.SignTransaction,
      EthMethod.SignTypedDataV1,
      EthMethod.SignTypedDataV3,
      EthMethod.SignTypedDataV4,
    ],
    type: 'eip155:eoa',
  };
}

// Mock checksummed addresses
export const MOCK_ADDRESS_1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
export const MOCK_ADDRESS_2 = '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756';

// Convert the addresses to lower case to test the edge case between lowercase vs checksummed addresses.
export const expectedUuid = createMockUuidFromAddress(
  MOCK_ADDRESS_1.toLowerCase(),
);
export const expectedUuid2 = createMockUuidFromAddress(
  MOCK_ADDRESS_2.toLowerCase(),
);

export const internalAccount1 = createMockInternalAccount(
  MOCK_ADDRESS_1.toLowerCase(),
  'Account 1',
);
export const internalAccount2 = createMockInternalAccount(
  MOCK_ADDRESS_2.toLowerCase(),
  'Account 2',
);

// used as a default mock for other tests
export const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      [expectedUuid]: internalAccount1,
      [expectedUuid2]: internalAccount2,
    },
    selectedAccount: expectedUuid2,
  },
};

// account IDs for different account types from MOCK_KEYRING_CONTROLLER_STATE
export const mockQRHardwareAccountId =
  createMockUuidFromAddress(mockQrKeyringAddress);
export const mockSimpleKeyringAccountId = createMockUuidFromAddress(
  mockSimpleKeyringAddress,
);
export const mockSnapAccount1Id = createMockUuidFromAddress(mockSnapAddress1);
export const mockSnapAccount2Id = createMockUuidFromAddress(mockSnapAddress2);
// internal accounts for different account types from MOCK_KEYRING_CONTROLLER_STATE
const mockQRHardwareInternalAccount: InternalAccount =
  createMockInternalAccount(
    mockQrKeyringAddress,
    'QR Hardware Account',
    KeyringTypes.qr,
  );
const mockSimpleKeyringInternalAccount: InternalAccount =
  createMockInternalAccount(
    mockSimpleKeyringAddress,
    'Simple Keyring Account',
    KeyringTypes.simple,
  );
const mockSnapAccount1InternalAccount: InternalAccount =
  createMockInternalAccount(
    mockSnapAddress1,
    'Snap Account 1',
    KeyringTypes.snap,
  );
const mockSnapAccount2InternalAccount: InternalAccount =
  createMockInternalAccount(
    mockSnapAddress2,
    'Snap Account 2',
    KeyringTypes.snap,
  );

export const MOCK_ACCOUNTS_CONTROLLER_STATE_WITH_KEYRING_TYPES: AccountsControllerState =
  {
    ...MOCK_ACCOUNTS_CONTROLLER_STATE,
    internalAccounts: {
      ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
      accounts: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts.accounts,
        [mockQRHardwareAccountId]: mockQRHardwareInternalAccount,
        [mockSimpleKeyringAccountId]: mockSimpleKeyringInternalAccount,
        [mockSnapAccount1Id]: mockSnapAccount1InternalAccount,
        [mockSnapAccount2Id]: {
          ...mockSnapAccount2InternalAccount,
          metadata: {
            ...mockSnapAccount2InternalAccount.metadata,
            snap: {
              id: 'metamask-simple-snap-keyring',
              name: 'MetaMask Simple Snap Keyring',
              enabled: true,
            },
          },
        },
      },
    },
  };

export function createMockAccountsControllerState(
  addresses: string[],
  selectedAddress?: string,
): AccountsControllerState {
  if (addresses.length === 0) {
    throw new Error('At least one address is required');
  }

  const accounts: { [uuid: string]: InternalAccount } = {};
  addresses.forEach((address, index) => {
    const uuid = createMockUuidFromAddress(address.toLowerCase());
    accounts[uuid] = createMockInternalAccount(
      address.toLowerCase(),
      `Account ${index + 1}`,
    );
  });

  const selectedAccount =
    selectedAddress && addresses.includes(selectedAddress)
      ? createMockUuidFromAddress(selectedAddress.toLowerCase())
      : createMockUuidFromAddress(addresses[0].toLowerCase());

  return {
    internalAccounts: {
      accounts,
      selectedAccount,
    },
  };
}

export function createMockAccountsControllerStateWithSnap(
  addresses: string[],
  snapName: string = '',
  snapAccountIndex: number = 0,
): AccountsControllerState {
  if (addresses.length === 0) {
    throw new Error('At least one address is required');
  }

  if (snapAccountIndex < 0 || snapAccountIndex >= addresses.length) {
    throw new Error('Invalid snapAccountIndex');
  }

  const state = createMockAccountsControllerState(
    addresses,
    addresses[snapAccountIndex],
  );

  const snapAccountUuid = createMockUuidFromAddress(
    addresses[snapAccountIndex].toLowerCase(),
  );

  state.internalAccounts.accounts[snapAccountUuid].metadata = {
    ...state.internalAccounts.accounts[snapAccountUuid].metadata,
    keyring: {
      type: KeyringTypes.snap,
    },
    snap: {
      id: snapName,
      name: snapName,
      enabled: true,
    },
  };

  return state;
}
