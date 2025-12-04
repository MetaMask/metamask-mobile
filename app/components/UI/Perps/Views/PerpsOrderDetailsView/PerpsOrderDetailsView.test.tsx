import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react-native';
import PerpsOrderDetailsView from './PerpsOrderDetailsView';
import type { Order } from '../../controllers/types';

let mockRouteParams: { order?: Order } = {};
const mockCancelOrder = jest.fn();
const mockShowToast = jest.fn();
const mockGetExplorerUrl = jest.fn();

// Mock dependencies
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaView: jest
      .fn()
      .mockImplementation(({ children, ...props }) => (
        <View {...props}>{children}</View>
      )),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
  };
});

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: jest.fn(),
  }),
  useRoute: () => ({
    params: mockRouteParams,
    key: 'test-route',
    name: 'PerpsOrderDetails',
  }),
}));

jest.mock('../../hooks/usePerpsTrading', () => ({
  usePerpsTrading: () => ({
    cancelOrder: mockCancelOrder,
  }),
}));

jest.mock('../../hooks/usePerpsMeasurement', () => ({
  usePerpsMeasurement: jest.fn(),
}));

jest.mock('../../hooks/usePerpsOrderFees', () => ({
  usePerpsOrderFees: () => ({
    totalFee: 0.5,
    makerFee: 0.2,
    takerFee: 0.3,
  }),
}));

jest.mock('../../hooks/usePerpsBlockExplorerUrl', () => ({
  usePerpsBlockExplorerUrl: () => ({
    getExplorerUrl: mockGetExplorerUrl,
  }),
}));

jest.mock('../../hooks/usePerpsToasts', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    PerpsToastOptions: {
      orderManagement: {
        shared: {
          cancellationInProgress: jest
            .fn()
            .mockReturnValue({ type: 'progress' }),
          cancellationSuccess: jest.fn().mockReturnValue({ type: 'success' }),
          cancellationFailed: { type: 'error' },
        },
      },
    },
  }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: () => ({ address: '0x1234' }),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      success: { default: '#00FF00' },
      error: { default: '#FF0000' },
      border: { muted: '#CCCCCC' },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

jest.mock('../../components/PerpsTokenLogo', () => 'PerpsTokenLogo');

jest.mock('../../utils/formatUtils', () => ({
  formatPerpsFiat: jest.fn((value) => `$${value.toFixed(2)}`),
  formatPositionSize: jest.fn((value) => value.toFixed(4)),
  formatOrderCardDate: jest.fn(() => 'Nov 25, 2025'),
}));

// Mock component-library Button to be testable
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const ReactModule = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockButton({
      label,
      onPress,
      testID,
    }: {
      label: string;
      onPress?: () => void;
      testID?: string;
    }) {
      return ReactModule.createElement(
        TouchableOpacity,
        { onPress, testID },
        ReactModule.createElement(Text, null, label),
      );
    },
    ButtonVariants: { Primary: 'Primary', Secondary: 'Secondary' },
    ButtonWidthTypes: { Full: 'Full' },
    ButtonSize: { Lg: 'Lg' },
  };
});

// Mock ButtonIcon for back button
jest.mock(
  '../../../../../component-library/components/Buttons/ButtonIcon',
  () => {
    const ReactModule = jest.requireActual('react');
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: function MockButtonIcon({
        onPress,
        testID,
      }: {
        onPress?: () => void;
        testID?: string;
      }) {
        return ReactModule.createElement(
          TouchableOpacity,
          { onPress, testID: testID || 'back-button' },
          ReactModule.createElement(Text, null, 'Back'),
        );
      },
      ButtonIconSizes: { Md: 'Md' },
    };
  },
);

describe('PerpsOrderDetailsView', () => {
  const mockOrder: Order = {
    orderId: 'order-123',
    symbol: 'BTC',
    size: '0.5',
    originalSize: '0.5',
    filledSize: '0',
    remainingSize: '0.5',
    price: '50000',
    side: 'buy',
    orderType: 'limit',
    timestamp: Date.now(),
    status: 'open',
    reduceOnly: false,
  };

  const mockPartiallyFilledOrder: Order = {
    ...mockOrder,
    orderId: 'order-456',
    filledSize: '0.25',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { order: mockOrder };
    mockCancelOrder.mockResolvedValue({ success: true });
    mockGetExplorerUrl.mockReturnValue('https://explorer.test.com');
  });

  afterEach(() => {
    mockRouteParams = {};
  });

  it('renders order details view with order data', () => {
    render(<PerpsOrderDetailsView />);

    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });

  it('renders error state when no order is provided', () => {
    mockRouteParams = {};

    render(<PerpsOrderDetailsView />);

    expect(screen.getByText('perps.errors.order_not_found')).toBeOnTheScreen();
  });

  it('renders cancel order button', () => {
    render(<PerpsOrderDetailsView />);

    expect(
      screen.getByText('perps.order_details.cancel_order'),
    ).toBeOnTheScreen();
  });

  it('renders cancel order button label', () => {
    render(<PerpsOrderDetailsView />);

    // Verify cancel button is rendered (this is one of the key actions)
    expect(
      screen.getByText('perps.order_details.cancel_order'),
    ).toBeOnTheScreen();
  });

  it('renders order date', () => {
    render(<PerpsOrderDetailsView />);

    expect(screen.getByText('Nov 25, 2025')).toBeOnTheScreen();
  });

  it('renders limit price label', () => {
    render(<PerpsOrderDetailsView />);

    expect(
      screen.getByText('perps.order_details.limit_price'),
    ).toBeOnTheScreen();
  });

  it('calls goBack when back button is pressed', () => {
    render(<PerpsOrderDetailsView />);

    fireEvent.press(screen.getByTestId('back-button'));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('cancels order successfully when cancel button is pressed', async () => {
    render(<PerpsOrderDetailsView />);

    fireEvent.press(screen.getByText('perps.order_details.cancel_order'));

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalledWith({
        orderId: 'order-123',
        coin: 'BTC',
      });
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  it('shows error toast when cancel order fails', async () => {
    mockCancelOrder.mockResolvedValue({ success: false });
    render(<PerpsOrderDetailsView />);

    fireEvent.press(screen.getByText('perps.order_details.cancel_order'));

    await waitFor(() => {
      expect(mockCancelOrder).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  it('shows error toast when cancel order throws exception', async () => {
    mockCancelOrder.mockRejectedValue(new Error('Network error'));
    render(<PerpsOrderDetailsView />);

    fireEvent.press(screen.getByText('perps.order_details.cancel_order'));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalled();
    });
  });

  it('shows fill percentage for partially filled orders', () => {
    mockRouteParams = { order: mockPartiallyFilledOrder };
    render(<PerpsOrderDetailsView />);

    expect(screen.getByText('50% filled')).toBeOnTheScreen();
  });

  it('shows open status for unfilled orders', () => {
    render(<PerpsOrderDetailsView />);

    expect(screen.getByText('perps.order_details.open')).toBeOnTheScreen();
  });

  it('renders short direction for sell orders', () => {
    const sellOrder = { ...mockOrder, side: 'sell' as const };
    mockRouteParams = { order: sellOrder };
    render(<PerpsOrderDetailsView />);

    expect(screen.getByText('BTC')).toBeOnTheScreen();
  });
});
