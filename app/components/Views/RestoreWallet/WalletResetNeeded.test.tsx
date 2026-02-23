import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import WalletResetNeeded from './WalletResetNeeded';
import Icon from '../../../component-library/components/Icons/Icon';
import Routes from '../../../constants/navigation/Routes';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../core/Analytics';

const mockNavigate = jest.fn();
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
      navigate: mockNavigate,
      dispatch: mockDispatch,
    }),
  };
});

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

describe('WalletResetNeeded', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders title text', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      expect(
        getByText('Unable to recover your wallet automatically'),
      ).toBeTruthy();
    });

    it('renders description text', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      expect(
        getByText(
          "We couldn't recover your wallet, but you might still be able to access your funds.",
        ),
      ).toBeTruthy();
    });

    it('renders Try again button', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      expect(getByText('Try again')).toBeTruthy();
    });

    it('renders Create new wallet button', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      expect(getByText('Create a new wallet')).toBeTruthy();
    });

    it('renders danger icon', () => {
      const { UNSAFE_getByType } = renderWithProvider(<WalletResetNeeded />);

      const iconElement = UNSAFE_getByType(Icon);
      expect(iconElement).toBeTruthy();
    });
  });

  describe('analytics tracking', () => {
    it('tracks screen viewed event on mount', () => {
      renderWithProvider(<WalletResetNeeded />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.VAULT_CORRUPTION_WALLET_RESET_NEEDED_SCREEN_VIEWED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('handleCreateNewWallet', () => {
    it('tracks button pressed event and navigates to delete wallet modal', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      fireEvent.press(getByText('Create a new wallet'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.VAULT_CORRUPTION_WALLET_RESET_NEEDED_CREATE_NEW_WALLET_BUTTON_PRESSED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.MODAL.DELETE_WALLET,
      });
    });
  });

  describe('handleTryAgain', () => {
    it('tracks button pressed event and navigates to restore wallet using dispatch', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      fireEvent.press(getByText('Try again'));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.VAULT_CORRUPTION_WALLET_RESET_NEEDED_TRY_AGAIN_BUTTON_PRESSED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        Routes.VAULT_RECOVERY.RESTORE_WALLET,
        expect.objectContaining({
          previousScreen: Routes.VAULT_RECOVERY.WALLET_RESET_NEEDED,
        }),
      );
    });
  });
});
