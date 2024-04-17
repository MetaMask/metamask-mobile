import { AccountsControllerState } from '@metamask/accounts-controller';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddressAsChecksum,
} from './accountsController';
import { v4 as uuid } from 'uuid';
import { EthMethod, InternalAccount } from '@metamask/keyring-api';

export function createMockUUIDFromAddress(address: string): string {
  const fakeShaFromAddress = Array.from(
    { length: 16 },
    (_, i) => address.charCodeAt(i) || 0,
  );
  return uuid({
    random: fakeShaFromAddress,
  });
}

export function createMockInternalAccount(
  address: string,
  nickname: string,
): InternalAccount {
  return {
    address,
    id: createMockUUIDFromAddress(address),
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

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';
const MOCK_ADDRESS_2 = '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756';

const expectedUUID = createMockUUIDFromAddress(MOCK_ADDRESS);
const expectedUUID2 = createMockUUIDFromAddress(MOCK_ADDRESS_2);

const internalAccount1 = createMockInternalAccount(MOCK_ADDRESS, 'Account 1');
const internalAccount2 = createMockInternalAccount(MOCK_ADDRESS_2, 'Account 2');

// used as a default mock for other tests
export const MOCK_ACCOUNTS_CONTROLLER_STATE: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      [expectedUUID]: internalAccount1,
      [expectedUUID2]: internalAccount2,
    },
    selectedAccount: expectedUUID2,
  },
};

describe('Accounts Controller Selectors', () => {
  describe('selectSelectedInternalAccount', () => {
    it('returns selected internal account', () => {
      expect(
        selectSelectedInternalAccount({
          engine: {
            backgroundState: {
              AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            },
          },
        } as any),
      ).toEqual({
        address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
        id: expectedUUID2,
        options: {},
        metadata: {
          name: 'Account 2',
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
      });
    });
  });
  describe('selectSelectedInternalAccountAddressAsChecksum', () => {
    it('returns selected internal account address in checksum format', () => {
      expect(
        selectSelectedInternalAccountAddressAsChecksum({
          engine: {
            backgroundState: {
              AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
            },
          },
        } as any),
      ).toEqual('0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756');
    });
  });
});
