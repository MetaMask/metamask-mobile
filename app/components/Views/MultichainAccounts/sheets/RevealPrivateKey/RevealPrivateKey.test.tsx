import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { RevealPrivateKey } from './RevealPrivateKey';
import { internalAccount1 as mockAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { SHEET_HEADER_BACK_BUTTON_ID } from '../../../../../component-library/components/Sheet/SheetHeader/SheetHeader.constants';
import ReduxService from '../../../../../core/redux/ReduxService';
import { ReduxStore } from '../../../../../core/redux/types';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGetInternalAccountByAddress = jest.fn().mockReturnValue(mockAccount);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: (screen: string, params?: object) => mockNavigate(screen, params),
    goBack: () => mockGoBack(),
  }),
  useFocusEffect: jest.fn((callback) => callback()),
  useRoute: () => ({
    params: {
      account: mockAccount,
    },
  }),
}));

jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  getInternalAccountByAddress: () => mockGetInternalAccountByAddress(),
}));

const mockExportAccount = jest.fn();
jest.mock('../../../../../core/Engine/Engine', () => ({
  context: {
    KeyringController: {
      exportAccount: mockExportAccount,
    },
  },
}));

const render = () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            accounts: {
              [mockAccount.id]: mockAccount,
            },
            selectedAccount: mockAccount.id,
          },
        },
        KeyringController: {
          keyrings: [
            {
              accounts: [mockAccount.address],
              type: KeyringTypes.hd,
              metadata: {
                id: 'mock-id',
                name: 'mock-name',
              },
            },
          ],
        },
      },
    },
  };
  return renderWithProvider(<RevealPrivateKey />, { state: initialState });
};

describe('RevealPrivateKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      dispatch: jest.fn(),
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
        settings: { lockTime: 1000 },
      }),
      subscribe: jest.fn(),
      replaceReducer: jest.fn(),
      [Symbol.observable]: jest.fn(),
    } as unknown as ReduxStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders correctly with account information', () => {
    const { getByText, getByPlaceholderText } = render();

    expect(
      getByText(strings('multichain_accounts.reveal_private_key.title')),
    ).toBeTruthy();
    expect(
      getByText(strings('multichain_accounts.reveal_private_key.banner_title')),
    ).toBeTruthy();
    expect(
      getByText(
        strings('multichain_accounts.reveal_private_key.banner_description'),
      ),
    ).toBeTruthy();
    expect(
      getByPlaceholderText(
        strings('multichain_accounts.reveal_private_key.password_placeholder'),
      ),
    ).toBeTruthy();
  });

  it('displays account name correctly', () => {
    const { getByText } = render();

    expect(getByText(mockAccount.metadata.name)).toBeTruthy();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render();
    const backButton = getByTestId(SHEET_HEADER_BACK_BUTTON_ID);

    expect(backButton).toBeTruthy();
    if (backButton) {
      fireEvent.press(backButton);
    }
    expect(mockGoBack).toHaveBeenCalled();
  });
});
