import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import ImportPrivateKey from './';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { QRTabSwitcherScreens } from '../QRTabSwitcher';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { ImportAccountFromPrivateKeyIDs } from '../../../../e2e/selectors/ImportAccount/ImportAccountFromPrivateKey.selectors';
import { Alert } from 'react-native';

// Mock dependencies
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockFetchAccountsWithActivity = jest.fn();
const mockCheckIsSeedlessPasswordOutdated = jest.fn();
const mockImportAccountFromPrivateKey = jest.fn();

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

jest.mock('../../hooks/useAccountsWithNetworkActivitySync', () => ({
  useAccountsWithNetworkActivitySync: () => ({
    fetchAccountsWithActivity: mockFetchAccountsWithActivity,
  }),
}));

jest.mock('../../../core', () => ({
  ...jest.requireActual('../../../core'),
  Authentication: {
    checkIsSeedlessPasswordOutdated: () =>
      mockCheckIsSeedlessPasswordOutdated(),
    importAccountFromPrivateKey: (privateKey: string) =>
      mockImportAccountFromPrivateKey(privateKey),
  },
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Cast Alert.alert as a mock for better TypeScript support
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('ImportPrivateKey', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        SeedlessOnboardingController: {
          authConnection: AuthConnection.Apple,
          socialBackupsMetadata: [],
        },
      },
    },
    settings: {},
  };

  const srpState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        SeedlessOnboardingController: {
          authConnection: undefined,
          socialBackupsMetadata: [],
        },
      },
    },
    settings: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays SRP warning description when user has no social auth connection', () => {
    const { getByText } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: srpState },
    );

    expect(getByText(strings('import_private_key.title'))).toBeTruthy();
    expect(
      getByText(strings('import_private_key.description_srp')),
    ).toBeTruthy();
    expect(getByText(strings('import_private_key.subtitle'))).toBeTruthy();
    expect(getByText(strings('import_private_key.cta_text'))).toBeTruthy();
    expect(
      getByText(strings('import_private_key.or_scan_a_qr_code')),
    ).toBeTruthy();
  });

  it('displays Apple/Google auth description when user has social auth connection', () => {
    const { getByText } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: initialState },
    );

    expect(getByText(strings('import_private_key.title'))).toBeTruthy();
    expect(
      getByText(strings('import_private_key.description_one')),
    ).toBeTruthy();
    expect(getByText(strings('import_private_key.subtitle'))).toBeTruthy();
  });

  it('calls dismiss function when close button is pressed', () => {
    // Arrange
    const { getByTestId } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: initialState },
    );

    // Act
    const closeButton = getByTestId(
      ImportAccountFromPrivateKeyIDs.CLOSE_BUTTON,
    );
    fireEvent.press(closeButton);

    // Assert
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('calls learnMore function with srp url when learn more text is pressed', () => {
    const { getByText } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: srpState },
    );

    const learnMoreText = getByText(strings('import_private_key.here'));
    expect(learnMoreText).toBeOnTheScreen();
    fireEvent.press(learnMoreText);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/start/use-an-existing-wallet/#importing-using-a-private-key',
        title: strings('drawer.metamask_support'),
      },
    });
  });

  it('calls learnMore function with social login url when learn more text is pressed', () => {
    const { getByText } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: initialState },
    );

    const learnMoreText = getByText(strings('import_private_key.learn_more'));
    expect(learnMoreText).toBeOnTheScreen();

    fireEvent.press(learnMoreText);

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://support.metamask.io/start/use-an-existing-wallet/#import-an-existing-wallet',
        title: strings('drawer.metamask_support'),
      },
    });
  });

  it('calls scanPkey function when QR scan button is pressed', () => {
    const { getByText } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: initialState },
    );

    const scanButton = getByText(
      strings('import_private_key.or_scan_a_qr_code'),
    );
    fireEvent.press(scanButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.QR_TAB_SWITCHER, {
      initialScreen: QRTabSwitcherScreens.Scanner,
      disableTabber: true,
      onScanSuccess: expect.any(Function),
    });
  });

  describe('goNext function', () => {
    it('shows error alert when private key is empty', async () => {
      const { getByTestId } = renderScreen(
        ImportPrivateKey,
        { name: 'ImportPrivateKey' },
        { state: initialState },
      );

      const importButton = getByTestId(
        ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
      );
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          strings('import_private_key.error_title'),
          strings('import_private_key.error_empty_message'),
        );
      });
    });

    it('successfully imports private key and navigates to success screen', async () => {
      mockImportAccountFromPrivateKey.mockResolvedValue(true);

      const { getByTestId } = renderScreen(
        ImportPrivateKey,
        { name: 'ImportPrivateKey' },
        { state: initialState },
      );

      const privateKeyInput = getByTestId(
        ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX,
      );
      const importButton = getByTestId(
        ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
      );

      // Enter a valid private key
      fireEvent.changeText(
        privateKeyInput,
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      );
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(mockImportAccountFromPrivateKey).toHaveBeenCalledWith(
          '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        );
        expect(mockNavigate).toHaveBeenCalledWith('ImportPrivateKeyView', {
          screen: 'ImportPrivateKeySuccess',
        });
        expect(mockFetchAccountsWithActivity).toHaveBeenCalled();
      });
    });

    it('shows error alert when import fails', async () => {
      mockImportAccountFromPrivateKey.mockRejectedValue(
        new Error('Import failed'),
      );

      const { getByTestId } = renderScreen(
        ImportPrivateKey,
        { name: 'ImportPrivateKey' },
        { state: initialState },
      );

      const privateKeyInput = getByTestId(
        ImportAccountFromPrivateKeyIDs.PRIVATE_KEY_INPUT_BOX,
      );
      const importButton = getByTestId(
        ImportAccountFromPrivateKeyIDs.IMPORT_BUTTON,
      );

      // Enter a valid private key
      fireEvent.changeText(
        privateKeyInput,
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      );
      fireEvent.press(importButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          strings('import_private_key.error_title'),
          strings('import_private_key.error_message'),
        );
      });
    });
  });

  describe('onScanSuccess function', () => {
    it('imports private key when scanned data contains private_key', async () => {
      mockImportAccountFromPrivateKey.mockResolvedValue(true);

      const { getByText } = renderScreen(
        ImportPrivateKey,
        { name: 'ImportPrivateKey' },
        { state: initialState },
      );

      const scanButton = getByText(
        strings('import_private_key.or_scan_a_qr_code'),
      );

      await act(async () => {
        fireEvent.press(scanButton);

        // Get the onScanSuccess callback from the navigation call
        const navCall = mockNavigate.mock.calls.find(
          (call) => call[0] === Routes.QR_TAB_SWITCHER,
        );
        const onScanSuccess = navCall[1].onScanSuccess;

        // Simulate successful scan with private key
        await onScanSuccess({
          private_key:
            '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        });
      });

      expect(mockImportAccountFromPrivateKey).toHaveBeenCalledWith(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      );
    });

    it('shows seed phrase error when scanned data contains seed', () => {
      const { getByText } = renderScreen(
        ImportPrivateKey,
        { name: 'ImportPrivateKey' },
        { state: initialState },
      );

      const scanButton = getByText(
        strings('import_private_key.or_scan_a_qr_code'),
      );
      fireEvent.press(scanButton);

      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.QR_TAB_SWITCHER,
      );
      const onScanSuccess = navCall[1].onScanSuccess;

      // Simulate scan with seed phrase
      onScanSuccess({ seed: 'abandon abandon abandon...' });

      expect(mockAlert).toHaveBeenCalledWith(
        strings('wallet.error'),
        strings('wallet.logout_to_import_seed'),
      );
    });

    it('shows error when scanned data is invalid', () => {
      const { getByText } = renderScreen(
        ImportPrivateKey,
        { name: 'ImportPrivateKey' },
        { state: initialState },
      );

      const scanButton = getByText(
        strings('import_private_key.or_scan_a_qr_code'),
      );
      fireEvent.press(scanButton);

      const navCall = mockNavigate.mock.calls.find(
        (call) => call[0] === Routes.QR_TAB_SWITCHER,
      );
      const onScanSuccess = navCall[1].onScanSuccess;

      // Simulate scan with invalid data
      onScanSuccess({ invalid: 'data' });

      expect(mockAlert).toHaveBeenCalledWith(
        strings('import_private_key.error_title'),
        strings('import_private_key.error_message'),
      );
    });
  });
});
