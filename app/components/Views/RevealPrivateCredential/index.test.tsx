import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RevealPrivateCredential } from './';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { RevealSeedViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';

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

  it('renders reveal private key correctly', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
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

  it('renders reveal SRP correctly', () => {
    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          params: {
            credentialName: SRP_CREDENTIAL,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows warning message on incorrect password', async () => {
    const { getByPlaceholderText, getByTestId } = renderWithProviders(
      <RevealPrivateCredential
        route={{
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
});
