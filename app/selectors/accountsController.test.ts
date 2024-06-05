import { AccountsControllerState } from '@metamask/accounts-controller';
import { captureException } from '@sentry/react-native';
import { Hex, isValidChecksumAddress } from '@metamask/utils';
import DefaultPreference from 'react-native-default-preference';
import {
  selectSelectedInternalAccount,
  selectInternalAccounts,
  selectSelectedInternalAccountChecksummedAddress,
} from './accountsController';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  expectedUuid,
  expectedUuid2,
  internalAccount1,
  MOCK_ADDRESS_2,
} from '../util/test/accountsControllerTestUtils';
import { RootState } from '../reducers';
import { AGREED } from '../constants/storage';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

describe('Accounts Controller Selectors', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    DefaultPreference.get = jest.fn(() => Promise.resolve(AGREED));
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
        } as RootState),
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
      const result = selectSelectedInternalAccount({
        engine: {
          backgroundState: {
            AccountsController: invalidState,
          },
        },
      } as RootState);
      expect(result).toBeUndefined();
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
        } as RootState),
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
  describe('selectSelectedInternalAccountChecksummedAddress', () => {
    it('returns selected internal account address in checksum format', () => {
      const result = selectSelectedInternalAccountChecksummedAddress({
        engine: {
          backgroundState: {
            AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
          },
        },
      } as RootState);
      const checksummedAddress = MOCK_ADDRESS_2;
      expect(isValidChecksumAddress(result as Hex)).toEqual(true);
      expect(result).toEqual(checksummedAddress);
    });
    it('returns undefined if selected account does not exist', () => {
      const result = selectSelectedInternalAccountChecksummedAddress({
        engine: {
          backgroundState: {
            AccountsController: {
              ...MOCK_ACCOUNTS_CONTROLLER_STATE,
              internalAccounts: {
                ...MOCK_ACCOUNTS_CONTROLLER_STATE.internalAccounts,
                selectedAccount: {},
              },
            },
          },
        },
      } as RootState);
      expect(result).toEqual(undefined);
    });
  });
});
