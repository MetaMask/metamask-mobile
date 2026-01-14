import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { HardwareAccountDetails } from './HardwareAccountDetails';
import { createMockInternalAccount } from '../../../../../../util/test/accountsControllerTestUtils';
import { EthAccountType } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { AccountDetailsIds } from '../../../AccountDetails.testIds';
import { HEADERBASE_TITLE_TEST_ID } from '../../../../../../component-library/components/HeaderBase/HeaderBase.constants';
import { AvatarAccountType } from '../../../../../../component-library/components/Avatars/Avatar';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../../confirmations/hooks/7702/useEIP7702Networks', () => ({
  useEIP7702Networks: jest.fn().mockReturnValue({
    network7702List: [],
    networkSupporting7702Present: false,
    pending: false,
  }),
}));

const mockInitialState = {
  settings: {
    avatarAccountType: AvatarAccountType.Maskicon,
  },
};

const hardwareWalletTypes = [
  {
    type: KeyringTypes.ledger,
    name: 'Ledger Account',
    address: '0x1234567890123456789012345678901234567890',
  },
  {
    type: KeyringTypes.trezor,
    name: 'Trezor Account',
    address: '0x9876543210987654321098765432109876543210',
  },
  {
    type: KeyringTypes.lattice,
    name: 'Lattice Account',
    address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
  },
  {
    type: KeyringTypes.qr,
    name: 'QR Hardware Account',
    address: '0xfedcbafedcbafedcbafedcbafedcbafedcbafedcba',
  },
];

describe('HardwareAccountDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders BaseAccountDetails wrapper', () => {
    const mockAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Hardware Account',
      KeyringTypes.ledger,
      EthAccountType.Eoa,
    );

    const { getByTestId } = renderWithProvider(
      <HardwareAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
    ).toBeTruthy();
  });

  it('renders RemoveAccount component', () => {
    const mockAccount = createMockInternalAccount(
      '0x1234567890123456789012345678901234567890',
      'Hardware Account',
      KeyringTypes.ledger,
      EthAccountType.Eoa,
    );

    const { getByTestId } = renderWithProvider(
      <HardwareAccountDetails account={mockAccount} />,
      { state: mockInitialState },
    );

    expect(getByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON)).toBeTruthy();
  });

  it.each(hardwareWalletTypes)(
    'handles $name correctly',
    ({ type, name, address }) => {
      const hardwareAccount = createMockInternalAccount(
        address,
        name,
        type,
        EthAccountType.Eoa,
      );

      const { getByTestId } = renderWithProvider(
        <HardwareAccountDetails account={hardwareAccount} />,
        { state: mockInitialState },
      );

      expect(
        getByTestId(AccountDetailsIds.ACCOUNT_DETAILS_CONTAINER),
      ).toBeTruthy();
      expect(getByTestId(HEADERBASE_TITLE_TEST_ID).children).toStrictEqual([
        name,
      ]);
      expect(getByTestId(AccountDetailsIds.REMOVE_ACCOUNT_BUTTON)).toBeTruthy();
    },
  );
});
