import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Routes from '../../../../../../../constants/navigation/Routes';
import { TRANSAK_SUPPORT_URL } from '../../../constants/constants';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({
  getParent: jest.fn(() => ({
    goBack: mockGoBack,
  })),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: mockGetParent,
  }),
}));

const mockLogoutFromProvider = jest.fn();
const mockGoToAggregator = jest.fn();

jest.mock('../../../../hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToAggregator: mockGoToAggregator,
  }),
}));

jest.mock('../../../sdk', () => ({
  useDepositSDK: () => ({
    logoutFromProvider: mockLogoutFromProvider,
    isAuthenticated: true,
    selectedRegion: { isoCode: 'US' },
  }),
}));

const mockShowToast = jest.fn();
jest.mock('../../../../../../../component-library/components/Toast', () => {
  const mockReact = jest.requireActual('react');
  return {
    ToastContext: mockReact.createContext({
      toastRef: { current: { showToast: mockShowToast } },
    }),
    ToastVariants: {
      Icon: 'Icon',
    },
  };
});

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

jest.mock('../../../../hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => ({
    ramp_routing: 'test_routing',
    is_authenticated: true,
    preferred_provider: 'transak',
    order_count: 5,
  }),
}));

jest.mock('../../../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock(
  '../../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const MockBottomSheet = mockReact.forwardRef(
      (
        { children }: { children: mockReact.ReactNode },
        _ref: mockReact.Ref<unknown>,
      ) => <View testID="bottom-sheet">{children}</View>,
    );
    MockBottomSheet.displayName = 'MockBottomSheet';
    return MockBottomSheet;
  },
);

jest.mock(
  '../../../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    const MockBottomSheetHeader = ({
      children,
      onClose,
    }: {
      children: React.ReactNode;
      onClose?: () => void;
    }) => (
      <View testID="bottom-sheet-header">
        <Text>{children}</Text>
        {onClose && (
          <TouchableOpacity testID="close-button" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
    MockBottomSheetHeader.displayName = 'MockBottomSheetHeader';
    return MockBottomSheetHeader;
  },
);

jest.mock('../../../../components/MenuItem', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  const MockMenuItem = ({
    title,
    onPress,
  }: {
    title: string;
    iconName?: string;
    description?: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity testID={`menu-item-${title}`} onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
  MockMenuItem.displayName = 'MockMenuItem';
  return MockMenuItem;
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      openURL: jest.fn(),
    },
  };
});

import ConfigurationModal from './ConfigurationModal';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../../component-library/components/Toast';

const renderWithToastProvider = (component: React.ReactElement) => {
  const mockToastRef = { current: { showToast: mockShowToast } };
  return render(
    <ToastContext.Provider value={{ toastRef: mockToastRef }}>
      {component}
    </ToastContext.Provider>,
  );
};

describe('ConfigurationModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with bottom sheet', () => {
    const { getByTestId } = renderWithToastProvider(<ConfigurationModal />);
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('renders view order history menu item', () => {
    const { getByText } = renderWithToastProvider(<ConfigurationModal />);
    expect(getByText('View order history')).toBeTruthy();
  });

  it('renders contact support menu item', () => {
    const { getByText } = renderWithToastProvider(<ConfigurationModal />);
    expect(getByText('Contact support')).toBeTruthy();
  });

  it('renders more ways to buy menu item', () => {
    const { getByText } = renderWithToastProvider(<ConfigurationModal />);
    expect(getByText('More ways to buy')).toBeTruthy();
  });

  it('navigates to order history when menu item is pressed', () => {
    const { getByText } = renderWithToastProvider(<ConfigurationModal />);

    fireEvent.press(getByText('View order history'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.TRANSACTIONS_VIEW, {
      screen: Routes.TRANSACTIONS_VIEW,
      params: {
        redirectToOrders: true,
      },
    });
  });

  it('opens support URL when contact support is pressed', () => {
    const { getByText } = renderWithToastProvider(<ConfigurationModal />);

    fireEvent.press(getByText('Contact support'));

    expect(Linking.openURL).toHaveBeenCalledWith(TRANSAK_SUPPORT_URL);
  });

  it('calls logoutFromProvider when logout is pressed', async () => {
    mockLogoutFromProvider.mockResolvedValueOnce(undefined);

    const { getByText } = renderWithToastProvider(<ConfigurationModal />);

    fireEvent.press(getByText('Log out of Transak'));

    await waitFor(() => {
      expect(mockLogoutFromProvider).toHaveBeenCalled();
    });
  });

  it('shows success toast when logout succeeds', async () => {
    mockLogoutFromProvider.mockResolvedValueOnce(undefined);

    const { getByText } = renderWithToastProvider(<ConfigurationModal />);

    fireEvent.press(getByText('Log out of Transak'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: ToastVariants.Icon,
        }),
      );
    });
  });

  it('tracks analytics and navigates to aggregator when more ways to buy is pressed', () => {
    const { getByText } = renderWithToastProvider(<ConfigurationModal />);

    fireEvent.press(getByText('More ways to buy'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      'RAMPS_BUTTON_CLICKED',
      expect.objectContaining({
        location: 'Deposit Settings Modal',
        ramp_type: 'BUY',
        region: 'US',
      }),
    );
    expect(mockGoToAggregator).toHaveBeenCalled();
  });
});

describe('ConfigurationModal Route Constants', () => {
  it('has transactions view route defined', () => {
    expect(Routes.TRANSACTIONS_VIEW).toBeDefined();
  });

  it('has deposit modals routes defined', () => {
    expect(Routes.DEPOSIT.MODALS.ID).toBeDefined();
    expect(Routes.DEPOSIT.MODALS.CONFIGURATION).toBeDefined();
  });
});
