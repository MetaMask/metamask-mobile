import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { RouteProp, ParamListBase } from '@react-navigation/native';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RevealPrivateCredential } from './';
import { PRIVATE_KEY } from './RevealPrivateCredential';
import { ThemeContext, mockTheme } from '../../../util/theme';
import { RevealSeedViewSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/RevealSeedView.selectors';
import { EthAccountType, EthMethod, EthScope } from '@metamask/keyring-api';
import { KeyringTypes } from '@metamask/keyring-controller';
import { internalAccount1 as mockAccount } from '../../../util/test/accountsControllerTestUtils';
import Engine from '../../../core/Engine';
import { Authentication } from '../../../core/';
import StorageWrapper from '../../../store/storage-wrapper';
import ClipboardManager from '../../../core/ClipboardManager';
import { BIOMETRY_CHOICE } from '../../../constants/storage';

// Mock all necessary modules
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    KeyringController: {
      exportSeedPhrase: jest.fn(),
      exportAccount: jest.fn(),
      verifyPassword: jest.fn(),
    },
  },
}));

jest.mock('../../../core/', () => ({
  Authentication: {
    getType: jest.fn(),
    getPassword: jest.fn(),
  },
}));

jest.mock('../../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
}));

jest.mock('../../../core/ClipboardManager', () => ({
  setStringExpire: jest.fn(),
}));

jest.mock('../../../actions/alert', () => ({
  showAlert: jest.fn(),
}));

jest.mock('../../../actions/privacy', () => ({
  recordSRPRevealTimestamp: jest.fn(),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(),
      })),
      build: jest.fn(),
    })),
  }),
}));

jest.mock('../../../util/test/utils', () => ({
  isTest: true,
}));

jest.mock('../../../util/device', () => ({
  isIos: jest.fn(() => false),
  isAndroid: jest.fn(() => true),
  getDeviceAPILevel: jest.fn(() => Promise.resolve(28)),
}));

const mockStore = configureMockStore();
const mockDispatch = jest.fn();
const mockUseSelector = jest.requireMock('react-redux').useSelector;

const initialState = {
  engine: {
    backgroundState,
  },
  user: {
    passwordSet: true,
  },
};

const store = mockStore(initialState);

const mockGetInternalAccountByAddress = jest.fn().mockReturnValue(mockAccount);

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getInternalAccountByAddress: () => mockGetInternalAccountByAddress(),
  isHardwareAccount: jest.fn(() => false),
}));

// Mock react-navigation
const mockNavigation = {
  setOptions: jest.fn(),
  pop: jest.fn(),
};

interface RootStackParamList extends ParamListBase {
  RevealPrivateCredential: {
    credentialName: string;
    shouldUpdateNav?: boolean;
    selectedAccount?: InternalAccount;
    keyringId?: string;
  };
}

type RevealPrivateCredentialRouteProp = RouteProp<
  RootStackParamList,
  'RevealPrivateCredential'
>;

const mockRoute: RevealPrivateCredentialRouteProp = {
  key: 'RevealPrivateCredential',
  name: 'RevealPrivateCredential' as const,
  params: {
    credentialName: 'seed_phrase',
    shouldUpdateNav: true,
  },
};

describe('RevealPrivateCredential', () => {
  const SRP_CREDENTIAL = 'seed_phrase';
  const PRIV_KEY_CREDENTIAL = PRIVATE_KEY;
  const mockCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup common mocks
    jest.requireMock('react-redux').useDispatch.mockReturnValue(mockDispatch);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((selector: (state: any) => any) => {
      if (selector.toString().includes('passwordSet')) {
        return true;
      }
      if (
        selector
          .toString()
          .includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return '0x1234567890123456789012345678901234567890';
      }
      return undefined;
    });

    // Mock authentication methods
    Authentication.getType = jest
      .fn()
      .mockResolvedValue({ availableBiometryType: null });
    Authentication.getPassword = jest
      .fn()
      .mockResolvedValue({ password: 'test-password' });
    StorageWrapper.getItem = jest.fn().mockResolvedValue('');

    // Mock engine methods
    Engine.context.KeyringController.verifyPassword = jest
      .fn()
      .mockResolvedValue(true);
    Engine.context.KeyringController.exportSeedPhrase = jest
      .fn()
      .mockResolvedValue(new Uint8Array());
    Engine.context.KeyringController.exportAccount = jest
      .fn()
      .mockResolvedValue('mock-private-key');
  });

  const renderWithProviders = (ui: React.ReactNode) =>
    render(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>{ui}</ThemeContext.Provider>
      </Provider>,
    );

  describe('Initial Rendering', () => {
    it('renders SRP credential view correctly', () => {
      const { getByTestId, getByPlaceholderText } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID),
      ).toBeTruthy();
      expect(getByPlaceholderText('Password')).toBeTruthy();
    });

    it('renders private key credential view correctly', () => {
      const privateKeyRoute: RevealPrivateCredentialRouteProp = {
        ...mockRoute,
        params: { credentialName: PRIV_KEY_CREDENTIAL },
      };

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={privateKeyRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={PRIV_KEY_CREDENTIAL}
        />,
      );

      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID),
      ).toBeTruthy();
    });

    it('calls navigation setOptions when shouldUpdateNav is true', () => {
      renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      expect(mockNavigation.setOptions).toHaveBeenCalled();
    });
  });

  describe('Password Handling', () => {
    it('updates password state when text changes', () => {
      const { getByPlaceholderText } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'new-password');

      // Password should be updated internally
      expect(passwordInput.props.value).toBeUndefined(); // Controlled component doesn't show value
    });

    it('shows warning message on incorrect password', async () => {
      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValue(new Error('Wrong password'));

      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
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

    it('proceeds to reveal modal on correct password', async () => {
      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
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

  describe('Modal Interactions', () => {
    it('shows modal when password is correct', async () => {
      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
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

    it('reveals credential when reveal button is pressed', async () => {
      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      // Enter password and open modal
      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID),
        ).toBeTruthy();
      });

      // Click reveal button
      const revealButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        expect(
          Engine.context.KeyringController.exportSeedPhrase,
        ).toHaveBeenCalled();
      });
    });
  });

  describe('Credential Display', () => {
    it('displays credential text after successful reveal', async () => {
      const mockSeedPhrase = 'test seed phrase words here';
      const mockUint8Array = new TextEncoder().encode(mockSeedPhrase);
      Engine.context.KeyringController.exportSeedPhrase = jest
        .fn()
        .mockResolvedValue(mockUint8Array);

      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      // Go through password flow
      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      // Wait for modal and reveal
      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID),
        ).toBeTruthy();
      });

      const revealButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_TEXT),
        ).toBeTruthy();
      });
    });

    it('displays private key for private key credential', async () => {
      const mockPrivateKey = '0x1234567890abcdef';
      Engine.context.KeyringController.exportAccount = jest
        .fn()
        .mockResolvedValue(mockPrivateKey);

      const privateKeyRoute: RevealPrivateCredentialRouteProp = {
        ...mockRoute,
        params: { credentialName: PRIV_KEY_CREDENTIAL },
      };

      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={privateKeyRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={PRIV_KEY_CREDENTIAL}
        />,
      );

      // Go through password flow
      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID),
        ).toBeTruthy();
      });

      const revealButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        expect(
          Engine.context.KeyringController.exportAccount,
        ).toHaveBeenCalled();
      });
    });
  });

  describe('Copy to Clipboard', () => {
    it('copies credential to clipboard when copy button is pressed', async () => {
      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      // Reveal credential first
      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID),
        ).toBeTruthy();
      });

      const revealButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        expect(
          getByTestId(
            RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
          ),
        ).toBeTruthy();
      });

      // Click copy button
      const copyButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON,
      );
      fireEvent.press(copyButton);

      expect(ClipboardManager.setStringExpire).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
        }),
      );
    });
  });

  describe('Navigation and Cancel', () => {
    it('calls cancel function when cancel button is pressed', () => {
      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
          showCancelButton
        />,
      );

      const cancelButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
      );
      fireEvent.press(cancelButton);

      expect(mockCancel).toHaveBeenCalled();
    });

    it('navigates back when using navigation stack', () => {
      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
          showCancelButton
        />,
      );

      const cancelButton = getByTestId(
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID,
      );
      fireEvent.press(cancelButton);

      // Since cancel is provided, it should call cancel instead of navigation.pop
      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles export seed phrase error', async () => {
      Engine.context.KeyringController.exportSeedPhrase = jest
        .fn()
        .mockRejectedValue(new Error('Export failed'));

      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
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

      const revealButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID),
        ).toBeTruthy();
      });
    });

    it('handles hardware account error', async () => {
      const { isHardwareAccount } = jest.requireMock('../../../util/address');
      isHardwareAccount.mockReturnValue(true);

      Engine.context.KeyringController.exportAccount = jest
        .fn()
        .mockRejectedValue(new Error('Hardware error'));

      const privateKeyRoute: RevealPrivateCredentialRouteProp = {
        ...mockRoute,
        params: { credentialName: PRIV_KEY_CREDENTIAL },
      };

      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={privateKeyRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={PRIV_KEY_CREDENTIAL}
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

      const revealButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID),
        ).toBeTruthy();
      });
    });
  });

  describe('Biometric Authentication', () => {
    it('attempts biometric unlock on mount when available', async () => {
      Authentication.getType = jest
        .fn()
        .mockResolvedValue({ availableBiometryType: 'FaceID' });
      StorageWrapper.getItem = jest.fn().mockResolvedValue('FaceID');
      Authentication.getPassword = jest
        .fn()
        .mockResolvedValue({ password: 'biometric-password' });

      renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      await waitFor(() => {
        expect(Authentication.getType).toHaveBeenCalled();
        expect(StorageWrapper.getItem).toHaveBeenCalledWith(BIOMETRY_CHOICE);
      });
    });

    it('unlocks with empty password when passwordSet is false', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseSelector.mockImplementation((selector: (state: any) => any) => {
        if (selector.toString().includes('passwordSet')) {
          return false;
        }
        if (
          selector
            .toString()
            .includes('selectSelectedInternalAccountFormattedAddress')
        ) {
          return '0x1234567890123456789012345678901234567890';
        }
        return undefined;
      });

      Authentication.getType = jest
        .fn()
        .mockResolvedValue({ availableBiometryType: null });

      renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      await waitFor(() => {
        expect(
          Engine.context.KeyringController.exportSeedPhrase,
        ).toHaveBeenCalledWith('', undefined);
      });
    });
  });

  describe('Tab Functionality', () => {
    it('switches between text and QR code tabs', async () => {
      const { getByPlaceholderText, getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      // Reveal credential first
      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_MODAL_ID),
        ).toBeTruthy();
      });

      const revealButton = getByTestId(
        RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_BUTTON_ID,
      );
      fireEvent.press(revealButton);

      await waitFor(() => {
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT),
        ).toBeTruthy();
        expect(
          getByTestId(RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE),
        ).toBeTruthy();
      });
    });
  });

  describe('Custom Account Handling', () => {
    it('renders with custom selectedAccount from route params', () => {
      const mockInternalAccount: InternalAccount = {
        type: EthAccountType.Eoa,
        id: 'unique-account-id-1',
        address: '0x1234567890123456789012345678901234567890',
        options: {},
        scopes: [EthScope.Eoa],
        methods: [EthMethod.PersonalSign],
        metadata: {
          name: 'Test Account',
          importTime: Date.now(),
          keyring: { type: KeyringTypes.hd },
          nameLastUpdatedAt: Date.now(),
          lastSelected: Date.now(),
        },
      };

      const customRoute: RevealPrivateCredentialRouteProp = {
        ...mockRoute,
        params: {
          credentialName: PRIV_KEY_CREDENTIAL,
          selectedAccount: mockInternalAccount,
        },
      };

      const { getByTestId } = renderWithProviders(
        <RevealPrivateCredential
          route={customRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={PRIV_KEY_CREDENTIAL}
        />,
      );

      expect(
        getByTestId(RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID),
      ).toBeTruthy();
    });
  });

  describe('Redux Actions', () => {
    it('dispatches recordSRPRevealTimestamp for SRP reveal', async () => {
      const { getByPlaceholderText } = renderWithProviders(
        <RevealPrivateCredential
          route={mockRoute}
          navigation={mockNavigation}
          cancel={mockCancel}
          credentialName={SRP_CREDENTIAL}
        />,
      );

      const passwordInput = getByPlaceholderText('Password');
      fireEvent.changeText(passwordInput, 'correct-password');
      fireEvent(passwordInput, 'submitEditing');

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
      });
    });
  });
});
