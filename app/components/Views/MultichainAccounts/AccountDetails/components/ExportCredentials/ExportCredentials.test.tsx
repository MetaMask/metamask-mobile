import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ExportCredentials } from './ExportCredentials';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { EthAccountType } from '@metamask/keyring-api';
import { ExportCredentialsIds } from '../../ExportCredentials.testIds';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = jest.requireMock('react-redux').useSelector;

const mockHdKeyringsWithSnapAccounts = jest.fn();
jest.mock('../../../../../hooks/useHdKeyringsWithSnapAccounts', () => ({
  useHdKeyringsWithSnapAccounts: () => mockHdKeyringsWithSnapAccounts(),
}));

const mockIsHDOrFirstPartySnapAccount = jest.fn();
const mockIsPrivateKeyAccount = jest.fn();

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  isHDOrFirstPartySnapAccount: () => mockIsHDOrFirstPartySnapAccount(),
  isPrivateKeyAccount: () => mockIsPrivateKeyAccount(),
}));

const mockKeyringId = 'keyring-1';
const mockAccount = {
  ...createMockInternalAccount('0x123', 'Test Account'),
  options: {
    entropySource: mockKeyringId,
  },
};
const mockPrivateKeyAccount = createMockInternalAccount(
  '0x123',
  'Test Account',
  KeyringTypes.simple,
  EthAccountType.Eoa,
);
const mockLedgerAccount = createMockInternalAccount(
  '0x123',
  'Test Account',
  KeyringTypes.ledger,
  EthAccountType.Eoa,
);

describe('ExportCredentials', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockUseSelector.mockImplementation(
      (
        callback: (state: { user: { seedphraseBackedUp: boolean } }) => boolean,
      ) => callback({ user: { seedphraseBackedUp: true } }),
    );
  });

  it('renders nothing when account cannot export private key or mnemonic', () => {
    mockHdKeyringsWithSnapAccounts.mockReturnValue([
      { accounts: [mockAccount.address], metadata: { id: mockKeyringId } },
    ]);
    mockIsHDOrFirstPartySnapAccount.mockReturnValue(false);
    mockIsPrivateKeyAccount.mockReturnValue(false);

    const result = render(<ExportCredentials account={mockLedgerAccount} />);

    expect(
      result.queryByText(
        strings('multichain_accounts.account_details.private_key'),
      ),
    ).toBeNull();
    expect(
      result.queryByText(
        new RegExp(strings('accounts.secret_recovery_phrase')),
      ),
    ).toBeNull();
  });

  it('shows only private key export option for private key accounts', () => {
    mockHdKeyringsWithSnapAccounts.mockReturnValue([
      { accounts: [mockAccount.address], metadata: { id: mockKeyringId } },
    ]);
    mockIsHDOrFirstPartySnapAccount.mockReturnValue(false);
    mockIsPrivateKeyAccount.mockReturnValue(true);

    const { getByText, queryByText } = render(
      <ExportCredentials account={mockPrivateKeyAccount} />,
    );

    expect(
      getByText(strings('multichain_accounts.account_details.private_key')),
    ).toBeTruthy();

    expect(
      queryByText(new RegExp(strings('accounts.secret_recovery_phrase'))),
    ).toBeNull();
  });

  it('shows both export options when HD account', () => {
    mockHdKeyringsWithSnapAccounts.mockReturnValue([
      {
        accounts: [mockAccount.address],
        metadata: { id: mockKeyringId },
      },
    ]);
    mockIsHDOrFirstPartySnapAccount.mockReturnValue(true);
    mockIsPrivateKeyAccount.mockReturnValue(true);

    const { getByText } = render(<ExportCredentials account={mockAccount} />);

    expect(
      getByText(strings('multichain_accounts.account_details.private_key')),
    ).toBeTruthy();
    expect(
      getByText(`${strings('accounts.secret_recovery_phrase')} 1`),
    ).toBeTruthy();
  });

  it('shows backup warning when seedphrase is not backed up', () => {
    mockUseSelector.mockImplementation(
      (
        callback: (state: { user: { seedphraseBackedUp: boolean } }) => boolean,
      ) => callback({ user: { seedphraseBackedUp: false } }),
    );
    mockHdKeyringsWithSnapAccounts.mockReturnValue([
      {
        accounts: [mockAccount.address],
        metadata: { id: mockKeyringId },
      },
    ]);

    mockIsHDOrFirstPartySnapAccount.mockReturnValue(true);
    mockIsPrivateKeyAccount.mockReturnValue(true);

    const { getByText } = render(<ExportCredentials account={mockAccount} />);

    expect(
      getByText(strings('multichain_accounts.export_credentials.backup')),
    ).toBeTruthy();
  });

  it('navigates to SRP reveal quiz when export mnemonic is pressed', () => {
    mockHdKeyringsWithSnapAccounts.mockReturnValue([
      {
        accounts: ['0x123'],
        metadata: { id: mockKeyringId },
      },
    ]);

    mockIsHDOrFirstPartySnapAccount.mockReturnValue(true);
    mockIsPrivateKeyAccount.mockReturnValue(false);

    const { getByText } = render(<ExportCredentials account={mockAccount} />);

    const mnemonicButton = getByText(
      `${strings('accounts.secret_recovery_phrase')} 1`,
    );
    fireEvent.press(mnemonicButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.SRP_REVEAL_QUIZ,
      keyringId: mockKeyringId,
    });
  });

  it('navigates to reveal private credential when export private key is pressed', () => {
    mockHdKeyringsWithSnapAccounts.mockReturnValue([
      {
        accounts: ['0x123'],
        metadata: { id: mockKeyringId },
      },
    ]);

    mockIsHDOrFirstPartySnapAccount.mockReturnValue(false);
    mockIsPrivateKeyAccount.mockReturnValue(true);

    const { getByTestId } = render(<ExportCredentials account={mockAccount} />);

    const privateKeyButton = getByTestId(
      ExportCredentialsIds.EXPORT_PRIVATE_KEY_BUTTON,
    );
    fireEvent.press(privateKeyButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
      {
        screen:
          Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REVEAL_PRIVATE_CREDENTIAL,
        params: { account: mockAccount },
      },
    );
  });
});
