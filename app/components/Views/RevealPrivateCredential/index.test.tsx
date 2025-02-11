import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RevealPrivateCredential } from './';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { RevealSeedViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
  user: {
    passwordSet: false,
  },
};
const store = mockStore(initialState);

describe('RevealPrivateCredential', () => {
  const SRP_CREDENTIAL = 'seed_phrase';
  const PRIV_KEY_CREDENTIAL = 'private_key';

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithProviders = (ui: unknown) =>
    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
      </Provider>,
    );

  it('renders reveal SRP correctly when the credential is directly passed', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: '',
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders reveal SRP correctly when the credential is passed via the route object', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        // @ts-expect-error - The error is ignored for testing purposes
        credentialName={undefined}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders reveal private key correctly', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: PRIV_KEY_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={PRIV_KEY_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows warning message on incorrect password', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );
    const passwordInput = getByPlaceholderText('Password');
    fireEvent.changeText(passwordInput, 'wrong-password');
    fireEvent(passwordInput, 'submitEditing');
    await waitFor(() => {
      expect(
        getByTestId(RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID),
      ).toBeTruthy();
    });
  });

  it('shows modal on correct password', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );
    const passwordInput = getByPlaceholderText('Password');
    fireEvent.changeText(passwordInput, 'correct-password');
    fireEvent(passwordInput, 'submitEditing');
    await waitFor(() => {
      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID),
      ).toBeTruthy();
    });
  });

  it('renders with a custom selectedAddress', async () => {
    const mockInternalAccount: InternalAccount = {
      type: EthAccountType.Eoa,
      id: 'unique-account-id-1',
      address: '0x1234567890123456789012345678901234567890',
      options: {
        someOption: 'optionValue',
        anotherOption: 42,
      },
      scopes: [EthScope.Eoa],
      methods: [
        EthMethod.PersonalSign,
        EthMethod.SignTransaction,
        EthMethod.SignTypedDataV1,
        EthMethod.SignTypedDataV3,
        EthMethod.SignTypedDataV4,
      ],
      metadata: {
        name: 'Test Account',
        importTime: Date.now(),
        keyring: {
          type: KeyringTypes.hd,
        },
        nameLastUpdatedAt: Date.now(),
        snap: {
          id: 'npm:@metamask/test-snap',
          name: 'Test Snap',
          enabled: true,
        },
        lastSelected: Date.now(),
      },
    };

    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: PRIV_KEY_CREDENTIAL,
            selectedAccount: mockInternalAccount,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={PRIV_KEY_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
