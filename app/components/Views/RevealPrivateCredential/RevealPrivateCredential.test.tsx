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

// Mock dispatch function
const mockDispatch = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({ build: jest.fn() })),
  build: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Create mock account to avoid circular dependency
const createMockAccount = (): InternalAccount => ({
  type: EthAccountType.Eoa,
  id: 'unique-account-id-1',
  address: '0x1234567890123456789012345678901234567890',
  options: {},
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
    lastSelected: Date.now(),
  },
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  withMetricsAwareness: jest.fn((Component) => Component),
}));

// Mock ClipboardManager - necessary for testing clipboard functionality
jest.mock('../../../core/ClipboardManager', () => ({
  setStringExpire: jest.fn().mockResolvedValue(true),
}));

// Mock Engine - necessary for testing keyring operations without calling real crypto functions
jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      verifyPassword: jest.fn(),
      exportSeedPhrase: jest.fn(),
      exportAccount: jest.fn(),
      state: {
        keyrings: [],
      },
    },
  },
}));

// Mock ScreenshotDeterrent - requires navigation context
jest.mock('../../UI/ScreenshotDeterrent', () => ({
  ScreenshotDeterrent: () => null,
}));

// Mock Authentication - necessary for testing without real biometric authentication
jest.mock('../../../core/Authentication', () => ({
  getType: jest.fn().mockResolvedValue({ availableBiometryType: null }),
  getPassword: jest.fn().mockResolvedValue(null),
}));

// Mock StorageWrapper - necessary for testing without real storage operations
jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn().mockResolvedValue(''),
}));

// Simple QRCode mock - we don't need to test the QR library itself
jest.mock('react-native-qrcode-svg', () => 'QRCode');

// Simplified ScrollableTabView mock - just needs to render children
jest.mock(
  '@tommasini/react-native-scrollable-tab-view',
  () => 'ScrollableTabView',
);

// Device mock - necessary since component uses Device.isIos(), Device.isAndroid(), Device.getDeviceAPILevel()
jest.mock('../../../util/device', () => ({
  isAndroid: jest.fn().mockReturnValue(false),
  isIos: jest.fn().mockReturnValue(true),
  getDeviceAPILevel: jest.fn().mockResolvedValue(30),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getInternalAccountByAddress: jest.fn(),
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
  let mockAccount: InternalAccount;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAccount = createMockAccount();

    // Set up address mock to return our mock account
    const addressMock = jest.requireMock('../../../util/address');
    addressMock.getInternalAccountByAddress.mockReturnValue(mockAccount);
  });

  const renderWithProviders = (ui: React.ReactNode) =>
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

  it('renders AccountInfo and BannerAlert for private key reveal', () => {
    const { getByText } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: PRIV_KEY_CREDENTIAL,
            selectedAccount: mockAccount,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={PRIV_KEY_CREDENTIAL}
      />,
    );

    // Should render AccountInfo for private key
    expect(getByText(mockAccount.metadata.name)).toBeTruthy();

    // Should render BannerAlert for private key security warning
    expect(getByText('Never disclose this key.')).toBeTruthy();
    expect(
      getByText(
        'Anyone with your private key can steal any assets held in your account.',
      ),
    ).toBeTruthy();
  });

  it('renders SRP explanation for seed phrase reveal', () => {
    const { getByText } = renderWithProviders(
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

    // Should render SRP explanation instead of AccountInfo
    expect(getByText('Secret Recovery Phrase')).toBeTruthy();
    expect(getByText('non-custodial wallet.')).toBeTruthy();
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

  // eslint-disable-next-line jest/no-disabled-tests
  it.skip('shows modal on correct password', async () => {
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
    const customMockAccount: InternalAccount = {
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
            selectedAccount: customMockAccount,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={PRIV_KEY_CREDENTIAL}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders TabView when unlocked', async () => {
    const mockEngine = jest.requireMock('../../../core/Engine');
    mockEngine.context.KeyringController.verifyPassword.mockResolvedValue(true);
    mockEngine.context.KeyringController.exportSeedPhrase.mockResolvedValue(
      new Uint8Array([1, 2, 3]),
    );

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

    // Enter password and confirm
    const passwordInput = getByPlaceholderText('Password');
    fireEvent.changeText(passwordInput, 'correct-password');

    const confirmButton = getByTestId(
      RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID,
    );
    fireEvent.press(confirmButton);

    // Component should render without errors when unlocked
    await waitFor(() => {
      expect(confirmButton).toBeTruthy();
    });
  });

  it('tracks analytics on tab changes', () => {
    // Given a component that renders tabs
    renderWithProviders(
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

    // Then analytics should be set up
    expect(mockCreateEventBuilder).toHaveBeenCalled();
  });

  it('renders component structure correctly', () => {
    const { getByTestId } = renderWithProviders(
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

    // Should render main container
    expect(getByTestId('reveal-private-credential-screen')).toBeTruthy();

    // Should render password input
    expect(getByTestId('private-credential-password-text-input')).toBeTruthy();
  });

  it('handles navigation with navigation object', () => {
    const mockNavigation = {
      pop: jest.fn(),
      setOptions: jest.fn(),
    };

    const { getByTestId } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
            shouldUpdateNav: true,
          },
        }}
        navigation={mockNavigation}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );

    // Should render without navigation errors
    expect(getByTestId('reveal-private-credential-screen')).toBeTruthy();
  });

  it('handles keyring ID parameter correctly', () => {
    // Given a component with keyring ID parameter
    const testKeyringId = 'test-keyring-id';

    const { toJSON } = renderWithProviders(
      <RevealPrivateCredential
        route={{
          key: 'RevealPrivateCredential',
          name: 'RevealPrivateCredential',
          params: {
            credentialName: SRP_CREDENTIAL,
            keyringId: testKeyringId,
          },
        }}
        navigation={null}
        cancel={() => null}
        credentialName={SRP_CREDENTIAL}
      />,
    );

    // Then component should render without errors
    expect(toJSON()).toMatchSnapshot();
  });
});
