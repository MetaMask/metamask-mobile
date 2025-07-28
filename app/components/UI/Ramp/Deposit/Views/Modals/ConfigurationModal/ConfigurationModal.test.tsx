import React from 'react';
import { Linking } from 'react-native';
import ConfigurationModal from './ConfigurationModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../../../../constants/navigation/Routes';
import { TRANSAK_SUPPORT_URL } from '../../../constants/constants';
import { ToastContext } from '../../../../../../../component-library/components/Toast';

const mockShowToast = jest.fn();
const mockToastRef = {
  current: {
    showToast: mockShowToast,
    closeToast: jest.fn(),
  },
};

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
      name: 'ConfigurationModal',
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

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockClearAuthToken = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
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

const mockUseDepositSDK = jest.fn();
jest.mock('../../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

jest.mock('../../../../../../../component-library/components/Toast', () => {
  const actualToast = jest.requireActual(
    '../../../../../../../component-library/components/Toast',
  );

  return {
    ...actualToast,
    ToastVariants: {
      Icon: 'Icon',
    },
  };
});

describe('ConfigurationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSDK.mockReturnValue({
      logoutFromProvider: mockClearAuthToken,
      isAuthenticated: false,
    });
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(ConfigurationModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('should navigate to order history when view order history is pressed', () => {
    const { getByText } = renderWithProvider(ConfigurationModal);
    const viewOrderHistoryButton = getByText('View order history');
    fireEvent.press(viewOrderHistoryButton);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: { redirectToOrders: true },
    });
  });

  it('should open support URL when contact support is pressed', () => {
    const { getByText } = renderWithProvider(ConfigurationModal);
    const contactSupportButton = getByText('Contact support');
    fireEvent.press(contactSupportButton);
    expect(Linking.openURL).toHaveBeenCalledWith(TRANSAK_SUPPORT_URL);
  });

  describe('when user is authenticated', () => {
    beforeEach(() => {
      mockUseDepositSDK.mockReturnValue({
        logoutFromProvider: mockClearAuthToken,
        isAuthenticated: true,
      });
    });

    it('should display logout option', () => {
      const { getByText } = renderWithProvider(ConfigurationModal);
      expect(getByText('Log out')).toBeTruthy();
    });

    it('should clear auth token and show success toast when logout is successful', async () => {
      mockClearAuthToken.mockResolvedValue(undefined);
      const { getByText } = renderWithProvider(ConfigurationModal);
      const logoutButton = getByText('Log out');
      fireEvent.press(logoutButton);

      expect(mockClearAuthToken).toHaveBeenCalled();

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          variant: 'Icon',
          labelOptions: [{ label: 'Successfully logged out' }],
          iconName: 'CheckBold',
          iconColor: 'Success',
          hasNoTimeout: false,
        });
      });
    });

    it('should show error toast when logout fails', async () => {
      const mockError = new Error('Logout failed');
      mockClearAuthToken.mockRejectedValue(mockError);
      const { getByText } = renderWithProvider(ConfigurationModal);
      const logoutButton = getByText('Log out');

      fireEvent.press(logoutButton);

      expect(mockClearAuthToken).toHaveBeenCalled();

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith({
          variant: 'Icon',
          labelOptions: [{ label: 'Error logging out' }],
          iconName: 'CircleX',
          iconColor: 'Error',
          hasNoTimeout: false,
        });
      });
    });
  });

  describe('when user is not authenticated', () => {
    it('should not display logout option', () => {
      const { queryByText } = renderWithProvider(ConfigurationModal);
      expect(queryByText('Log out')).toBeNull();
    });
  });
});
