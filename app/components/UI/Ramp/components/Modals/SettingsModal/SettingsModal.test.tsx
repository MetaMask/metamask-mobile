import React from 'react';
import { Linking } from 'react-native';
import SettingsModal from './SettingsModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import Routes from '../../../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import {
  getProviderToken,
  resetProviderToken,
} from '../../../Deposit/utils/ProviderTokenVault';
import { PROVIDER_LINKS } from '../../../Aggregator/types';
import type { Provider } from '@metamask/ramps-controller';

const MOCK_SUPPORT_URL = 'https://support.test-provider.com';
const MOCK_TRANSAK_SUPPORT_URL = 'https://support.transak.com';

const createMockProvider = (overrides?: Partial<Provider>): Provider => ({
  id: '/providers/test-provider',
  name: 'Test Provider',
  environmentType: 'PRODUCTION',
  description: 'Test Provider Description',
  hqAddress: '123 Test St',
  links: [
    {
      name: PROVIDER_LINKS.SUPPORT,
      url: MOCK_SUPPORT_URL,
    },
  ],
  logos: { light: '', dark: '', height: 24, width: 79 },
  ...overrides,
});

const TRANSAK_PROVIDER_ID = '/providers/transak-native';

const createMockTransakProvider = (
  overrides?: Partial<Provider>,
): Provider => ({
  id: TRANSAK_PROVIDER_ID,
  name: 'Transak',
  environmentType: 'PRODUCTION',
  description: 'Transak Provider',
  hqAddress: '123 Transak St',
  links: [
    {
      name: PROVIDER_LINKS.SUPPORT,
      url: MOCK_TRANSAK_SUPPORT_URL,
    },
  ],
  logos: { light: '', dark: '', height: 24, width: 79 },
  ...overrides,
});

jest.mock('../../../Deposit/utils/ProviderTokenVault', () => ({
  getProviderToken: jest.fn(),
  resetProviderToken: jest.fn(),
}));

const mockGetProviderToken = getProviderToken as jest.MockedFunction<
  typeof getProviderToken
>;
const mockResetProviderToken = resetProviderToken as jest.MockedFunction<
  typeof resetProviderToken
>;

const mockShowToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: jest.fn(),
  },
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      ...actualReactNavigation.useNavigation(),
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    Linking: {
      openURL: jest.fn(),
    },
  };
});

let mockSelectedProvider: Provider | null = createMockProvider();
const mockSetSelectedProvider = jest.fn();

jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    selectedProvider: mockSelectedProvider,
    setSelectedProvider: mockSetSelectedProvider,
  }),
}));

jest.mock('../../../../../../component-library/components/Toast', () => {
  const actualToast = jest.requireActual(
    '../../../../../../component-library/components/Toast',
  );

  return {
    ...actualToast,
    ToastVariants: {
      Icon: 'Icon',
    },
  };
});

function renderWithProvider(component: React.ComponentType) {
  const WrappedComponent = () => {
    const Component = component;
    return (
      <ToastContext.Provider value={{ toastRef: mockToastRef }}>
        <Component />
      </ToastContext.Provider>
    );
  };

  return renderScreen(
    WrappedComponent,
    {
      name: 'SettingsModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('SettingsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedProvider = createMockProvider();
    mockGetProviderToken.mockResolvedValue({
      success: false,
      error: 'No token found',
    });
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(SettingsModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays settings title in header', () => {
    const { getByText } = renderWithProvider(SettingsModal);

    expect(getByText('Settings')).toBeOnTheScreen();
  });

  it('displays view order history menu item', () => {
    const { getByText } = renderWithProvider(SettingsModal);

    expect(getByText('View order history')).toBeOnTheScreen();
  });

  it('navigates to transactions view when view order history is pressed', () => {
    const { getByText } = renderWithProvider(SettingsModal);

    const viewOrderHistoryButton = getByText('View order history');
    fireEvent.press(viewOrderHistoryButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  });

  describe('contact support', () => {
    it('displays contact support menu item when provider has support URL', () => {
      const { getByText } = renderWithProvider(SettingsModal);

      expect(getByText('Contact support')).toBeOnTheScreen();
    });

    it('opens support URL when contact support is pressed', () => {
      const { getByText } = renderWithProvider(SettingsModal);

      const contactSupportButton = getByText('Contact support');
      fireEvent.press(contactSupportButton);

      expect(Linking.openURL).toHaveBeenCalledWith(MOCK_SUPPORT_URL);
    });

    it('hides contact support when provider has no support URL', () => {
      mockSelectedProvider = createMockProvider({ links: [] });

      const { queryByText } = renderWithProvider(SettingsModal);

      expect(queryByText('Contact support')).toBeNull();
    });
  });

  describe('logout (Transak only)', () => {
    beforeEach(() => {
      mockSelectedProvider = createMockTransakProvider();
      mockGetProviderToken.mockResolvedValue({
        success: true,
        token: {
          created: new Date(),
          accessToken: 'test-access-token',
          ttl: 3600,
        },
      });
    });

    it('displays logout option when user is authenticated with Transak', async () => {
      const { findByText } = renderWithProvider(SettingsModal);

      const logoutButton = await findByText('Log out of Transak');

      expect(logoutButton).toBeOnTheScreen();
    });

    it('clears provider token and shows success toast on logout', async () => {
      mockResetProviderToken.mockResolvedValue(undefined);

      const { findByText } = renderWithProvider(SettingsModal);

      const logoutButton = await findByText('Log out of Transak');
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(mockResetProviderToken).toHaveBeenCalled();
      });

      expect(mockSetSelectedProvider).toHaveBeenCalledWith(null);
      expect(mockShowToast).toHaveBeenCalledWith({
        variant: 'Icon',
        labelOptions: [{ label: 'Successfully logged out' }],
        iconName: 'CheckBold',
        iconColor: 'Success',
        hasNoTimeout: false,
      });
    });

    it('shows error toast when logout fails', async () => {
      const mockError = new Error('Logout failed');
      mockResetProviderToken.mockRejectedValue(mockError);

      const { findByText } = renderWithProvider(SettingsModal);

      const logoutButton = await findByText('Log out of Transak');
      await act(async () => {
        fireEvent.press(logoutButton);
      });

      await waitFor(() => {
        expect(mockResetProviderToken).toHaveBeenCalled();
      });

      expect(mockShowToast).toHaveBeenCalledWith({
        variant: 'Icon',
        labelOptions: [{ label: 'Error logging out' }],
        iconName: 'CircleX',
        iconColor: 'Error',
        hasNoTimeout: false,
      });
    });

    it('hides logout option for non-Transak providers even when authenticated', async () => {
      mockSelectedProvider = createMockProvider();

      const { queryByText } = renderWithProvider(SettingsModal);

      await waitFor(() => {
        expect(queryByText(/Log out of/)).toBeNull();
      });
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      mockSelectedProvider = createMockTransakProvider();
      mockGetProviderToken.mockResolvedValue({
        success: false,
        error: 'No token found',
      });
    });

    it('hides logout option for Transak', async () => {
      const { queryByText } = renderWithProvider(SettingsModal);

      await waitFor(() => {
        expect(queryByText('Log out of Transak')).toBeNull();
      });
    });
  });

  describe('when no preferred provider is set', () => {
    beforeEach(() => {
      mockSelectedProvider = null;
    });

    it('hides contact support option', () => {
      const { queryByText } = renderWithProvider(SettingsModal);

      expect(queryByText('Contact support')).toBeNull();
    });

    it('hides logout option even when authenticated', async () => {
      mockGetProviderToken.mockResolvedValue({
        success: true,
        token: {
          created: new Date(),
          accessToken: 'test-access-token',
          ttl: 3600,
        },
      });

      const { queryByText } = renderWithProvider(SettingsModal);

      await waitFor(() => {
        expect(queryByText(/Log out of/)).toBeNull();
      });
    });
  });
});
