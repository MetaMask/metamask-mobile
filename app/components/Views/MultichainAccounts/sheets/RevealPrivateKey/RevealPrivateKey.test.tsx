import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { TouchableOpacity } from 'react-native';
import { RevealPrivateKey } from './RevealPrivateKey';
import { internalAccount1 as mockAccount } from '../../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { strings } from '../../../../../../locales/i18n';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

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
  return renderWithProvider(
    <SafeAreaProvider>
      <RevealPrivateKey />
    </SafeAreaProvider>,
    { state: initialState },
  );
};

describe('RevealPrivateKey', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const rendered = render();
    const { root } = rendered;
    const touchableOpacities = root.findAllByType(TouchableOpacity);

    // Hack to get the button
    const backButton = touchableOpacities.find(
      (touchable) =>
        touchable.props.accessible === true && touchable.props.onPress,
    );

    expect(backButton).toBeTruthy();
    if (backButton) {
      fireEvent.press(backButton);
    }
    expect(mockGoBack).toHaveBeenCalled();
  });
});
