import { KeyringTypes } from '@metamask/keyring-controller';
import { useHdKeyringsWithSnapAccounts } from './useHdKeyringsWithSnapAccounts';
import {
  createMockInternalAccount,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../util/test/accountsControllerTestUtils';
import { SolAccountType } from '@metamask/keyring-api';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';

const mockHdAccount = createMockInternalAccount(
  MOCK_ADDRESS_1,
  'Account 1',
  KeyringTypes.hd,
);

const mockHdAccount2 = createMockInternalAccount(
  MOCK_ADDRESS_2,
  'Account 2',
  KeyringTypes.hd,
);

const MOCK_SOLANA_ADDRESS_1 = 'F9SpmMkV2rdbZoJxwpFQ192pCyZwcVDc8F9V6B1AWTbR';
const MOCK_SOLANA_ADDRESS_2 = '6iryHNVRSPD3NjEEyfjt11TYHzcGMV7B6vaSCL7MYYAm';
const mockFirstPartySnapAccount = {
  ...createMockInternalAccount(
    MOCK_SOLANA_ADDRESS_1,
    'First Party Snap Account',
    KeyringTypes.snap,
    SolAccountType.DataAccount,
  ),
  options: {
    entropySource: 'keyring1',
  },
};

const mockSnapAccount2 = createMockInternalAccount(
  MOCK_SOLANA_ADDRESS_2,
  'Second Party Snap Account',
  KeyringTypes.snap,
  SolAccountType.DataAccount,
);

const mockHdKeyringMetadata = {
  id: 'keyring1',
};

const mockHdKeyringMetadata2 = {
  id: 'keyring2',
};

const mockSnapKeyringMetadata = {
  id: 'keyring3',
};

const mockHdKeyring = {
  type: KeyringTypes.hd,
  accounts: [mockHdAccount.address],
  metadata: mockHdKeyringMetadata,
};

const mockHdKeyring2 = {
  type: KeyringTypes.hd,
  accounts: [mockHdAccount2.address],
  metadata: mockHdKeyringMetadata2,
};

const mockSnapKeyring = {
  type: KeyringTypes.snap,
  accounts: [mockFirstPartySnapAccount.address, mockSnapAccount2.address],
  metadata: mockSnapKeyringMetadata,
};

const mockInitialState = {
  engine: {
    backgroundState: {
      AccountsController: {
        internalAccounts: {
          accounts: {
            [mockHdAccount.id]: mockHdAccount,
            [mockHdAccount2.id]: mockHdAccount2,
            [mockFirstPartySnapAccount.id]: mockFirstPartySnapAccount,
            [mockSnapAccount2.id]: mockSnapAccount2,
          },
          selectedAccount: mockHdAccount.id,
        },
      },
      KeyringController: {
        keyrings: [mockHdKeyring, mockHdKeyring2, mockSnapKeyring],
        keyringsMetadata: [
          mockHdKeyringMetadata,
          mockHdKeyringMetadata2,
          mockSnapKeyringMetadata,
        ],
      },
    },
  },
};

describe('useHdKeyringsWithSnapAccounts', () => {
  it('includes snap accounts that have a matching entropy source', () => {
    const { result } = renderHookWithProvider(
      () => useHdKeyringsWithSnapAccounts(),
      {
        state: mockInitialState,
      },
    );

    const expectedResult = [
      {
        ...mockHdKeyring,
        accounts: [mockHdAccount.address, mockFirstPartySnapAccount.address],
      },
      {
        ...mockHdKeyring2,
        accounts: [mockHdAccount2.address],
      },
    ];

    expect(result.current).toEqual(expectedResult);
  });

  it('handles empty keyrings', () => {
    const { result } = renderHookWithProvider(
      () => useHdKeyringsWithSnapAccounts(),
      {
        state: {
          engine: {
            backgroundState: {
              AccountsController: {
                internalAccounts: {
                  accounts: {},
                  selectedAccount: '',
                },
              },
              KeyringController: {
                keyrings: [],
                keyringsMetadata: [],
              },
            },
          },
        },
      },
    );

    expect(result.current).toEqual([]);
  });
});
