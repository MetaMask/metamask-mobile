import { AccountsControllerState } from '@metamask/accounts-controller';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddressAsChecksum,
} from './accountsController';

const ACCOUNTS_CONTROLLER_STATE_MOCK: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      '30313233-3435-4637-b839-383736353430': {
        address: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
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
      '30313233-3435-4637-b839-383736353431': {
        address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
        id: '30313233-3435-4637-b839-383736353431',
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
      },
    },
    selectedAccount: '30313233-3435-4637-b839-383736353431',
  },
};
describe('Accounts Controller Selectors', () => {
  describe('selectSelectedInternalAccount', () => {
    it('returns selected internal account', () => {
      expect(
        selectSelectedInternalAccount({
          engine: {
            backgroundState: {
              AccountsController: ACCOUNTS_CONTROLLER_STATE_MOCK,
            },
          },
        } as any),
      ).toEqual({
        address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
        id: '30313233-3435-4637-b839-383736353431',
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
    it('returns selected internal account', () => {
      expect(
        selectSelectedInternalAccountAddressAsChecksum({
          engine: {
            backgroundState: {
              AccountsController: ACCOUNTS_CONTROLLER_STATE_MOCK,
            },
          },
        } as any),
      ).toEqual('0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756');
    });
  });
});
