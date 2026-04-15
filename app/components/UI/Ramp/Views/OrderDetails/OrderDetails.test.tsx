import React from 'react';
import { ActivityIndicator } from 'react-native';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import OrderDetails, {
  createRampsOrderDetailsNavDetails,
} from './OrderDetails';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { RampsOrderDetailsSelectorsIDs } from './OrderDetails.testIds';
import { RampsOrderStatus } from '@metamask/ramps-controller';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
const mockReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setParams: mockSetParams,
    reset: mockReset,
  }),
}));

const mockGetOrderById = jest.fn();
const mockRefreshOrder = jest.fn();
const mockGetOrderFromCallback = jest.fn();
const mockAddOrder = jest.fn();
jest.mock('../../hooks/useRampsOrders', () => ({
  useRampsOrders: () => ({
    getOrderById: mockGetOrderById,
    refreshOrder: mockRefreshOrder,
    getOrderFromCallback: mockGetOrderFromCallback,
    addOrder: mockAddOrder,
  }),
}));

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: (props: object) => ({ build: () => ({ ...props }) }),
    }),
  }),
}));

const mockUseParams = jest.fn<Record<string, string | undefined>, []>(() => ({
  orderId: 'test-order-123',
}));
jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('./OrderContent', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const ReactActual = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ order }: { order: { providerOrderId: string } }) =>
      ReactActual.createElement(
        View,
        { testID: 'order-content' },
        ReactActual.createElement(Text, null, order?.providerOrderId ?? ''),
      ),
  };
});

jest.mock('../../Aggregator/components/ScreenLayout', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const ReactActual = require('react');
  const { View } = require('react-native');
  const Layout = ({
    children,
    testID,
  }: {
    children: React.ReactNode;
    testID?: string;
  }) => ReactActual.createElement(View, { testID }, children);
  Layout.Body = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  Layout.Content = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(View, null, children);
  return { __esModule: true, default: Layout };
});

const mockOrder = {
  providerOrderId: 'ord-123',
  status: RampsOrderStatus.Completed,
  provider: { id: 'paypal' },
  walletAddress: '0x123',
};

function render() {
  return renderScreen(OrderDetails, {
    name: Routes.RAMP.RAMPS_ORDER_DETAILS,
  });
}

describe('OrderDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOrderById.mockReturnValue(mockOrder);
    mockUseParams.mockReturnValue({ orderId: 'ord-123' });
  });

  it('displays order content when order exists', async () => {
    mockRefreshOrder.mockResolvedValue(undefined);
    const { getByTestId } = render();
    await waitFor(() => {
      expect(mockGetOrderById).toHaveBeenCalledWith('ord-123');
    });
    expect(getByTestId('order-content')).toBeOnTheScreen();
  });

  it('displays order content when order is loaded', async () => {
    const { getByTestId } = render();
    await waitFor(() => {
      expect(
        getByTestId(RampsOrderDetailsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
    expect(getByTestId('order-content')).toBeOnTheScreen();
  });

  it('renders empty ScreenLayout when order is not found', () => {
    mockGetOrderById.mockReturnValue(undefined);
    const { queryByTestId } = render();
    expect(queryByTestId('order-content')).not.toBeOnTheScreen();
  });

  it('shows loading state when order is pending and refreshing', () => {
    mockUseParams.mockReturnValue({ orderId: 'ord-123' });
    mockGetOrderById.mockReturnValue({
      ...mockOrder,
      status: RampsOrderStatus.Pending,
    });
    // eslint-disable-next-line no-empty-function -- Never-resolving promise for loading state test
    mockRefreshOrder.mockImplementation(() => new Promise<never>(() => {}));
    const { UNSAFE_getAllByType } = render();
    const indicators = UNSAFE_getAllByType(ActivityIndicator);
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('shows error state with retry when refresh fails', async () => {
    mockUseParams.mockReturnValue({ orderId: 'ord-pending' });
    mockGetOrderById.mockReturnValue({
      ...mockOrder,
      status: RampsOrderStatus.Pending,
    });
    mockRefreshOrder.mockRejectedValue(new Error('Refresh failed'));

    const { getByText } = render();

    await waitFor(() => {
      expect(getByText('ramps_order_details.try_again')).toBeOnTheScreen();
    });

    await act(async () => {
      fireEvent.press(getByText('ramps_order_details.try_again'));
    });
    expect(mockRefreshOrder).toHaveBeenCalled();
  });

  it('tracks RAMPS_SCREEN_VIEWED when order is displayed', async () => {
    render();
    await waitFor(() => {
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'Order Details',
          ramp_type: 'UNIFIED_BUY_2',
        }),
      );
    });
  });

  it('createRampsOrderDetailsNavDetails returns correct route', () => {
    const result = createRampsOrderDetailsNavDetails();
    expect(result[0]).toBe(Routes.RAMP.RAMPS_ORDER_DETAILS);
  });

  it('calls navigation.goBack when header back is pressed with loaded order', async () => {
    const { getByTestId } = render();

    await waitFor(() => {
      expect(getByTestId('order-content')).toBeOnTheScreen();
    });

    fireEvent.press(getByTestId('ramps-order-details-back-navbar-button'));

    expect(mockGoBack).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('shows error state with retry when initial callback fetch fails', async () => {
    mockUseParams.mockReturnValue({
      callbackUrl: 'metamask://on-ramp/providers/paypal?orderId=abc',
      providerCode: 'paypal',
      walletAddress: '0x123',
    });
    mockGetOrderById.mockReturnValue(undefined);
    mockGetOrderFromCallback.mockRejectedValue(
      new Error('Network request failed'),
    );

    const { getByText } = render();

    await waitFor(() => {
      expect(getByText('Network request failed')).toBeOnTheScreen();
    });
    expect(getByText('ramps_order_details.try_again')).toBeOnTheScreen();

    await act(async () => {
      fireEvent.press(getByText('ramps_order_details.try_again'));
    });
    expect(mockGetOrderFromCallback).toHaveBeenCalledTimes(2);
    expect(mockGetOrderFromCallback).toHaveBeenNthCalledWith(
      2,
      'paypal',
      'metamask://on-ramp/providers/paypal?orderId=abc',
      '0x123',
    );
  });
});
