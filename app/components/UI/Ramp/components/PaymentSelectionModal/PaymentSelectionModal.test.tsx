import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentSelectionModal from './PaymentSelectionModal';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return {
    ...Reanimated,
    useAnimatedStyle: (styleFunc: () => object) => styleFunc(),
    useSharedValue: (initialValue: number) => ({ value: initialValue }),
    withTiming: (toValue: number) => toValue,
  };
});

jest.mock('../../../../Base/RemoteImage', () => jest.fn(() => null));

const mockOnCloseBottomSheet = jest.fn();

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        {
          children,
        }: {
          children: React.ReactNode;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
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
    disclaimer: "Credit card purchases may incur your bank's cash advance fees.",
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
    disclaimer: "Credit card purchases may incur your bank's cash advance fees.",
    delay: '5 to 10 minutes.',
    pendingOrderDescription:
      'Card purchases may take a few minutes to complete.',
  },
];

const mockPreferredProvider = {
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
  mockPreferredProvider,
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

const mockSetPreferredProvider = jest.fn();
const mockSetSelectedPaymentMethod = jest.fn();

const mockSelectedToken = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
  name: 'Ethereum',
  decimals: 18,
  address: null,
  iconUrl: 'https://example.com/eth.png',
};

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    preferredProvider: mockPreferredProvider,
    providers: mockProviders,
    paymentMethods: mockPaymentMethods,
    setPreferredProvider: mockSetPreferredProvider,
    setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
    selectedToken: mockSelectedToken,
  }),
}));

const mockTmpPaymentMethods = [
  {
    id: '/payments/bank-transfer',
    paymentType: 'bank-transfer',
    name: 'Bank Transfer',
    score: 85,
    icon: 'bank',
    disclaimer: 'Bank transfers may take 1-3 business days.',
    delay: '1 to 3 days.',
    pendingOrderDescription: 'Bank transfers are processing.',
  },
];

const mockFetchPaymentMethods = jest.fn().mockResolvedValue({
  payments: mockTmpPaymentMethods,
});

jest.mock('../../hooks/useRampsPaymentMethods', () => ({
  useRampsPaymentMethods: () => ({
    fetchPaymentMethods: mockFetchPaymentMethods,
  }),
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
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithProvider(PaymentSelectionModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays header with "Pay with" text', () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    expect(getByText('fiat_on_ramp.pay_with')).toBeOnTheScreen();
  });

  it('displays subtitle text', () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    expect(
      getByText('fiat_on_ramp.debit_card_payments_more_likely'),
    ).toBeOnTheScreen();
  });

  it('displays payment methods list', () => {
    const { getAllByText } = renderWithProvider(PaymentSelectionModal);

    const paymentMethodNames = getAllByText('Debit or Credit');
    expect(paymentMethodNames.length).toBeGreaterThan(0);
  });

  it('calls onCloseBottomSheet when payment method is pressed without tmp provider', async () => {
    const { getAllByText } = renderWithProvider(PaymentSelectionModal);

    const paymentMethodItems = getAllByText('Debit or Credit');
    fireEvent.press(paymentMethodItems[0]);

    await waitFor(() => {
      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalled();
      expect(mockSetPreferredProvider).not.toHaveBeenCalled();
    });
  });

  it('navigates to provider selection when provider pill is pressed', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const providerPill = getByText('Transak');
    fireEvent.press(providerPill);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp_aggregator.providers')).toBeOnTheScreen();
    });
  });

  it('displays providers list in provider selection', async () => {
    const { getByText, getAllByText } = renderWithProvider(PaymentSelectionModal);

    const providerPill = getByText('Transak');
    fireEvent.press(providerPill);

    await waitFor(() => {
      expect(getAllByText('Transak').length).toBeGreaterThan(0);
      expect(getByText('MoonPay')).toBeOnTheScreen();
    });
  });

  it('fetches tmp payment methods when provider is selected', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const providerPill = getByText('Transak');
    fireEvent.press(providerPill);

    await waitFor(() => {
      const moonPayProvider = getByText('MoonPay');
      fireEvent.press(moonPayProvider);
    });

    await waitFor(() => {
      expect(mockFetchPaymentMethods).toHaveBeenCalledWith({
        assetId: 'eip155:1/slip44:60',
        provider: '/providers/moonpay',
        doNotUpdateState: true,
      });
    });
  });

  it('displays tmp payment methods after provider selection', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const providerPill = getByText('Transak');
    fireEvent.press(providerPill);

    await waitFor(() => {
      const moonPayProvider = getByText('MoonPay');
      fireEvent.press(moonPayProvider);
    });

    await waitFor(() => {
      expect(getByText('Bank Transfer')).toBeOnTheScreen();
    });
  });

  it('persists provider and payment method when tmp payment method is selected', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const providerPill = getByText('Transak');
    fireEvent.press(providerPill);

    await waitFor(() => {
      const moonPayProvider = getByText('MoonPay');
      fireEvent.press(moonPayProvider);
    });

    await waitFor(() => {
      const bankTransfer = getByText('Bank Transfer');
      fireEvent.press(bankTransfer);
    });

    await waitFor(() => {
      expect(mockSetPreferredProvider).toHaveBeenCalledWith(mockProviders[1]);
      expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(mockTmpPaymentMethods[0]);
      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });
  });
});
