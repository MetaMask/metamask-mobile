import { selectInternalAccounts } from '.';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  expectedUuid,
  expectedUuid2,
} from '../../util/test/accountsControllerTestUtils';

describe('selectInternalAccounts', () => {
  it('returns all internal accounts in the accounts controller state', () => {
    expect(
      selectInternalAccounts({
        engine: {
          backgroundState: {
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          },
        },
      } as any),
    ).toEqual([
      {
        address: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
        id: expectedUuid,
        metadata: { name: 'Account 1', keyring: { type: 'HD Key Tree' } },
        options: {},
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
      {
        address: '0xc4966c0d659d99699bfd7eb54d8fafee40e4a756',
        id: expectedUuid2,
        metadata: { name: 'Account 2', keyring: { type: 'HD Key Tree' } },
        options: {},
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
    ]);
  });
});
