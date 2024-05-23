import { AccountsControllerState } from '@metamask/accounts-controller';
import {
  selectSelectedInternalAccount,
  selectInternalAccounts,
} from './accountsController';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  expectedUuid,
  expectedUuid2,
  internalAccount1,
} from '../util/test/accountsControllerTestUtils';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Accounts Controller Selectors', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });
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
        id: expectedUuid2,
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
    it('throws an error if the selected account ID does not exist', () => {
      const invalidState: AccountsControllerState = {
        internalAccounts: {
          accounts: {
            [expectedUuid]: internalAccount1,
          },
          selectedAccount: 'non-existent-id',
        },
      };
      const errorMessage =
        'selectSelectedInternalAccount: Account with ID non-existent-id not found.';
      expect(() =>
        selectSelectedInternalAccount({
          engine: {
            backgroundState: {
              AccountsController: invalidState,
            },
          },
        } as any),
      ).toThrow(errorMessage);
      expect(mockedCaptureException).toHaveBeenCalledWith(expect.any(Error));
      expect(mockedCaptureException.mock.calls[0][0].message).toBe(
        errorMessage,
      );
    });
  });
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
});
