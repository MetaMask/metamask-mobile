import { AccountsControllerState } from '@metamask/accounts-controller';
import selectSelectedInternalAccount from './accountsController';

const ACCOUNTS_CONTROLLER_STATE_MOCK: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      '30313233-3435-4637-b839-383736353430': {
        address: '0x0',
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
        address: '0x1',
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
        address: '0x1',
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
});
