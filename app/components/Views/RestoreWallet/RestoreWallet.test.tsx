import React from 'react';
import { Image, ActivityIndicator } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import RestoreWallet from './RestoreWallet';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../core/Analytics';
import EngineService from '../../../core/EngineService';

const mockReplace = jest.fn();
const mockDispatch = jest.fn((action) => {
  if (action.type === 'REPLACE') {
    mockReplace(action.payload.name, action.payload.params);
  }
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      dispatch: mockDispatch,
    }),
  };
});

jest.mock('../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(
    (routeName: string, nestedRouteName?: string) =>
      (params?: Record<string, unknown>) => [
        nestedRouteName ?? routeName,
        params,
      ],
  ),
  useParams: jest.fn(() => ({
    previousScreen: 'Login',
  })),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ category: 'test' }),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../util/metrics', () => jest.fn(() => ({ device: 'test' })));

jest.mock('../../../core/EngineService', () => ({
  initializeVaultFromBackup: jest.fn(),
}));

describe('RestoreWallet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders title text', () => {
      const { getByText } = renderWithProvider(<RestoreWallet />);

      expect(getByText('Wallet restore needed')).toBeTruthy();
    });

    it('renders description text', () => {
      const { getByText } = renderWithProvider(<RestoreWallet />);

      expect(
        getByText(
          "Something unexpected happened. Don't worry, your wallet is safe. Sit tight while we restore it.",
        ),
      ).toBeTruthy();
    });

    it('renders Restore button', () => {
      const { getByText } = renderWithProvider(<RestoreWallet />);

      expect(getByText("Let's restore it")).toBeTruthy();
    });

    it('renders device image', () => {
      const { UNSAFE_getByType } = renderWithProvider(<RestoreWallet />);

      const imageElement = UNSAFE_getByType(Image);
      expect(imageElement).toBeTruthy();
    });
  });

  describe('analytics tracking', () => {
    it('tracks screen viewed event on mount', () => {
      renderWithProvider(<RestoreWallet />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_SCREEN_VIEWED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('handleOnNext', () => {
    it('navigates to WalletRestored when restore succeeds', async () => {
      (EngineService.initializeVaultFromBackup as jest.Mock).mockResolvedValue({
        success: true,
      });
      const { getByText } = renderWithProvider(<RestoreWallet />);

      fireEvent.press(getByText("Let's restore it"));

      await waitFor(() => {
        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.VAULT_CORRUPTION_RESTORE_WALLET_BUTTON_PRESSED,
        );
        expect(EngineService.initializeVaultFromBackup).toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith(
          Routes.VAULT_RECOVERY.WALLET_RESTORED,
          undefined,
        );
      });
    });

    it('navigates to WalletResetNeeded when restore fails', async () => {
      (EngineService.initializeVaultFromBackup as jest.Mock).mockResolvedValue({
        success: false,
      });
      const { getByText } = renderWithProvider(<RestoreWallet />);

      fireEvent.press(getByText("Let's restore it"));

      await waitFor(() => {
        expect(EngineService.initializeVaultFromBackup).toHaveBeenCalled();
        expect(mockDispatch).toHaveBeenCalled();
        expect(mockReplace).toHaveBeenCalledWith(
          Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED,
          undefined,
        );
      });
    });

    it('shows loading indicator while restoring', async () => {
      let resolveRestore: (value: { success: boolean }) => void;
      const restorePromise = new Promise<{ success: boolean }>((resolve) => {
        resolveRestore = resolve;
      });
      (EngineService.initializeVaultFromBackup as jest.Mock).mockReturnValue(
        restorePromise,
      );
      const { getByText, UNSAFE_getByType } = renderWithProvider(
        <RestoreWallet />,
      );

      fireEvent.press(getByText("Let's restore it"));

      expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();

      // @ts-expect-error resolveRestore is assigned in Promise constructor
      resolveRestore({ success: true });

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled();
      });
    });
  });
});
