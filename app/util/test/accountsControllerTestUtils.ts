import { v4 as uuidV4 } from 'uuid';
import {
  EthAccountType,
  BtcAccountType,
  SolAccountType,
  EthMethod,
  EthScope,
  BtcScope,
  SolScope,
  KeyringAccountType,
  BtcMethod,
  SolMethod,
  CaipChainId,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  AccountId,
  AccountsControllerState,
} from '@metamask/accounts-controller';
import { KeyringTypes } from '@metamask/keyring-controller';
import {
  mockQrKeyringAddress,
  mockSimpleKeyringAddress,
  mockSnapAddress1,
  mockSnapAddress2,
} from './keyringControllerTestUtils';

export function createMockUuidFromAddress(address: string): AccountId {
  const fakeShaFromAddress = Array.from(
    { length: 16 },
    (_, i) => address.charCodeAt(i) || 0,
  );
  return uuidV4({
    random: fakeShaFromAddress,
  });
}

/**
 * Maps account types to their corresponding scopes
 * @param accountType - The type of account (ETH, BTC, or Solana)
 * @returns Array of scopes corresponding to the account type
 */
function getAccountTypeScopes(accountType: KeyringAccountType): CaipChainId[] {
  // Define scope mappings
  const scopeMappings = {
    // Ethereum account types
    [EthAccountType.Eoa]: [EthScope.Eoa],
    [EthAccountType.Erc4337]: [EthScope.Testnet],

    // Bitcoin account types
    [BtcAccountType.P2wpkh]: [BtcScope.Mainnet],

    // Solana account types
    [SolAccountType.DataAccount]: [SolScope.Mainnet],
  };

  const scopes = scopeMappings[accountType];
  if (!scopes) {
    throw new Error(`Unsupported account type: ${accountType}`);
  }

  return scopes;
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
    scopes: getAccountTypeScopes(accountType),
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
    type: EthAccountType.Eoa,
    scopes: [EthScope.Eoa],
  };
}

export const MOCK_ACCOUNT_BIP122_P2WPKH: InternalAccount = {
  id: 'ae247df6-3911-47f7-9e36-28e6a7d96078',
  address: 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
  options: {},
  methods: [BtcMethod.SendBitcoin],
  scopes: [BtcScope.Mainnet],
  type: BtcAccountType.P2wpkh,
  metadata: {
    name: 'Bitcoin Account',
    keyring: { type: KeyringTypes.snap },
    importTime: 1691565967600,
    lastSelected: 1955565967656,
  },
};

export const MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET: InternalAccount = {
  id: 'fcdafe8b-4bdf-4e25-9051-e255b2a0af5f',
  address: 'tb1q6rmsq3vlfdhjdhtkxlqtuhhlr6pmj09y6w43g8',
  options: {},
  methods: [BtcMethod.SendBitcoin],
  scopes: [BtcScope.Testnet],
  type: BtcAccountType.P2wpkh,
  metadata: {
    name: 'Bitcoin Testnet Account',
    keyring: { type: KeyringTypes.snap },
    importTime: 1691565967600,
    lastSelected: 1955565967656,
  },
};

export const MOCK_SOLANA_ACCOUNT: InternalAccount = {
  address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
  id: '1',
  type: SolAccountType.DataAccount,
  methods: [SolMethod.SendAndConfirmTransaction],
  options: {},
  metadata: {
    name: 'Solana Account',
    importTime: 1684232000456,
    keyring: {
      type: KeyringTypes.snap,
    },
    snap: {
      id: 'npm:"@metamask/solana-wallet-snap',
      name: 'Solana Wallet Snap',
      enabled: true,
    },
  },
  scopes: [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet],
};

export const MOCK_MULTICHAIN_NON_EVM_ACCOUNTS = {
  [MOCK_ACCOUNT_BIP122_P2WPKH.id]: MOCK_ACCOUNT_BIP122_P2WPKH,
  [MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET.id]: MOCK_ACCOUNT_BIP122_P2WPKH_TESTNET,
  [MOCK_SOLANA_ACCOUNT.id]: MOCK_SOLANA_ACCOUNT,
};

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
