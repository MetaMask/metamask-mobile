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

      expect(getByText('New wallet needed')).toBeTruthy();
    });

    it('renders description text', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      expect(
        getByText(
          "Something's wrong with your wallet, and you'll need to create a new one. Because your accounts are on the blockchain, they're still safe. Only the preferences, saved networks, account names, and related data saved on your device are gone.",
        ),
      ).toBeTruthy();
    });

    it('renders Try again button', () => {
      const { getByText } = renderWithProvider(<WalletResetNeeded />);

      expect(getByText('Try recovering wallet')).toBeTruthy();
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

      fireEvent.press(getByText('Try recovering wallet'));

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
