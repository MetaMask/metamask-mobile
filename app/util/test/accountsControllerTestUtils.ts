import { v4 as uuidV4 } from 'uuid';
import { EthMethod, InternalAccount } from '@metamask/keyring-api';
import { AccountsControllerState } from '@metamask/accounts-controller';

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
): InternalAccount {
  return {
    address,
    id: createMockUuidFromAddress(address),
    metadata: {
      name: nickname,
      keyring: {
        type: 'HD Key Tree',
      },
    },
    options: {},
    methods: [
      EthMethod.PersonalSign,
      EthMethod.Sign,
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
