import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentSelectionModal from './PaymentSelectionModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = jest.fn();
  return {
    ...Reanimated,
    useAnimatedStyle: (styleFunc: () => object) => styleFunc(),
    useSharedValue: (initialValue: number) => ({ value: initialValue }),
    withTiming: (toValue: number) => toValue,
  };
});

jest.mock('../../../../../Base/RemoteImage', () => jest.fn(() => null));

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  callback?.();
});

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        {
          children,
        }: {
          children: React.ReactNode;
        },
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

const mockUseParams = jest.fn(() => ({}));
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  locale: 'en',
}));

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    useWindowDimensions: () => ({
      width: 375,
      height: 812,
    }),
  };
});

const mockPaymentMethods = [
  {
    id: '/payments/debit-credit-card-1',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
  {
    id: '/payments/debit-credit-card-2',
    paymentType: 'debit-credit-card',
    name: 'Debit or Credit',
    score: 90,
    icon: 'card',
    disclaimer:
      "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
];

const mockSelectedProvider = {
  id: '/providers/transak',
  name: 'Transak',
  environmentType: 'PRODUCTION',
  description: 'Test provider',
  hqAddress: 'Test Address',
  links: [],
  logos: {
    light: 'https://example.com/logo-light.png',
    dark: 'https://example.com/logo-dark.png',
    height: 24,
    width: 90,
  },
};

const mockProviders = [
  mockSelectedProvider,
  {
    id: '/providers/moonpay',
    name: 'MoonPay',
    environmentType: 'PRODUCTION',
    description: 'Test provider 2',
    hqAddress: 'Test Address 2',
    links: [],
    logos: {
      light: 'https://example.com/moonpay-light.png',
      dark: 'https://example.com/moonpay-dark.png',
      height: 24,
      width: 90,
    },
  },
];

const mockSetSelectedProvider = jest.fn();
const mockSetSelectedPaymentMethod = jest.fn();

const defaultControllerReturn = {
  selectedProvider: mockSelectedProvider,
  providers: mockProviders,
  paymentMethods: mockPaymentMethods,
  paymentMethodsLoading: false,
  paymentMethodsError: null,
  selectedPaymentMethod: mockPaymentMethods[0],
  setSelectedProvider: mockSetSelectedProvider,
  setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
  getQuotes: jest.fn().mockResolvedValue({
    success: [],
    error: [],
    sorted: [],
    customActions: [],
  }),
  userRegion: { regionCode: 'us', country: { currency: 'USD' } },
  selectedToken: {
    assetId: 'eip155:1/slip44:60',
    chainId: 'eip155:1',
    symbol: 'ETH',
  },
};

const mockUseRampsController: jest.Mock = jest.fn(
  () => defaultControllerReturn,
);

jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: () => mockUseRampsController(),
}));

jest.mock('../../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => '0x123',
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'PaymentSelectionModal',
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

describe('PaymentSelectionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsController.mockImplementation(() => defaultControllerReturn);
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(PaymentSelectionModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays header with "Pay with" text', () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    expect(getByText('fiat_on_ramp.pay_with')).toBeOnTheScreen();
  });

  it('displays payment methods list', () => {
    const { getAllByText } = renderWithProvider(PaymentSelectionModal);

    const paymentMethodNames = getAllByText('Debit or Credit');
    expect(paymentMethodNames.length).toBeGreaterThan(0);
  });

  it('calls onCloseBottomSheet when payment method is pressed', async () => {
    const { getAllByText } = renderWithProvider(PaymentSelectionModal);

    const paymentMethodItems = getAllByText('Debit or Credit');
    fireEvent.press(paymentMethodItems[0]);

    await waitFor(() => {
      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(
        mockPaymentMethods[0],
      );
    });
  });

  it('invokes onPaymentMethodSelect from route params when payment method is pressed', async () => {
    const mockOnPaymentMethodSelect = jest.fn();
    mockUseParams.mockReturnValue({
      onPaymentMethodSelect: mockOnPaymentMethodSelect,
    });

    const { getAllByText } = renderWithProvider(PaymentSelectionModal);

    const paymentMethodItems = getAllByText('Debit or Credit');
    fireEvent.press(paymentMethodItems[0]);

    await waitFor(() => {
      expect(mockOnPaymentMethodSelect).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to provider selection when change provider is pressed', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp.providers')).toBeOnTheScreen();
    });
  });

  it('displays provider selection when change provider is pressed', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp.providers')).toBeOnTheScreen();
    });
  });

  it('returns to payment selection when back is pressed from provider selection', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      PaymentSelectionModal,
    );

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp.providers')).toBeOnTheScreen();
    });

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp.pay_with')).toBeOnTheScreen();
    });
  });

  it('does not navigate to provider selection when change provider is pressed and payment methods are loading', async () => {
    const loadingState = {
      ...defaultControllerReturn,
      selectedProvider: mockSelectedProvider,
      paymentMethods: [],
      paymentMethodsLoading: true,
      selectedPaymentMethod: null,
    };
    mockUseRampsController.mockImplementation(() => loadingState);
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp.pay_with')).toBeOnTheScreen();
    });
  });

  it('does not navigate to provider selection when change provider is pressed and there is a payment method error', async () => {
    const errorState = {
      ...defaultControllerReturn,
      selectedProvider: mockSelectedProvider,
      paymentMethods: [],
      paymentMethodsError: 'Failed to fetch payment methods',
      selectedPaymentMethod: null,
    };
    mockUseRampsController.mockImplementation(() => errorState);
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('Failed to fetch payment methods')).toBeOnTheScreen();
    });
  });

  it('matches snapshot when payment methods are loading', () => {
    const loadingState = {
      ...defaultControllerReturn,
      selectedProvider: null,
      paymentMethods: [],
      paymentMethodsLoading: true,
      selectedPaymentMethod: null,
      userRegion: null,
      selectedToken: null,
    };
    mockUseRampsController.mockImplementation(() => loadingState);
    const { toJSON } = renderWithProvider(PaymentSelectionModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot when payment methods fail to load', () => {
    const errorState = {
      ...defaultControllerReturn,
      paymentMethods: [],
      paymentMethodsError: 'Failed to fetch payment methods',
      selectedPaymentMethod: null,
    };
    mockUseRampsController.mockImplementation(() => errorState);
    const { toJSON } = renderWithProvider(PaymentSelectionModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot when no payment methods are available', () => {
    const emptyState = {
      ...defaultControllerReturn,
      paymentMethods: [],
      selectedPaymentMethod: null,
    };
    mockUseRampsController.mockImplementation(() => emptyState);
    const { toJSON } = renderWithProvider(PaymentSelectionModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('calls getQuotes with payment method params when on PAYMENT view', () => {
    const mockGetQuotes = jest.fn().mockResolvedValue({
      success: [],
      error: [],
      sorted: [],
      customActions: [],
    });
    mockUseRampsController.mockImplementation(() => ({
      ...defaultControllerReturn,
      getQuotes: mockGetQuotes,
    }));
    renderWithProvider(PaymentSelectionModal);

    expect(mockGetQuotes).toHaveBeenCalledWith({
      amount: 100,
      walletAddress: '0x123',
      assetId: 'eip155:1/slip44:60',
      providers: ['/providers/transak'],
      paymentMethods: [
        '/payments/debit-credit-card-1',
        '/payments/debit-credit-card-2',
      ],
    });
  });

  it('calls getQuotes with provider params when navigating to PROVIDER view', async () => {
    const mockGetQuotes = jest.fn().mockResolvedValue({
      success: [],
      error: [],
      sorted: [],
      customActions: [],
    });
    mockUseRampsController.mockImplementation(() => ({
      ...defaultControllerReturn,
      getQuotes: mockGetQuotes,
      selectedPaymentMethod: mockPaymentMethods[0],
    }));
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    mockGetQuotes.mockClear();
    fireEvent.press(getByText('fiat_on_ramp.change_provider'));

    await waitFor(() => {
      expect(mockGetQuotes).toHaveBeenCalledWith({
        amount: 100,
        walletAddress: '0x123',
        assetId: 'eip155:1/slip44:60',
        providers: ['/providers/transak', '/providers/moonpay'],
        paymentMethods: ['/payments/debit-credit-card-1'],
      });
    });
  });
});
