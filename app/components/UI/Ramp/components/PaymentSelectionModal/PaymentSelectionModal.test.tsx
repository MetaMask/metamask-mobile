import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentSelectionModal from './PaymentSelectionModal';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

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

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    selectedProvider: mockSelectedProvider,
    providers: mockProviders,
    paymentMethods: mockPaymentMethods,
    setSelectedProvider: mockSetSelectedProvider,
    setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
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

  it('navigates to provider selection when change provider is pressed', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp_aggregator.providers')).toBeOnTheScreen();
    });
  });

  it('displays provider selection when change provider is pressed', async () => {
    const { getByText } = renderWithProvider(PaymentSelectionModal);

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp_aggregator.providers')).toBeOnTheScreen();
    });
  });

  it('returns to payment selection when back is pressed from provider selection', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      PaymentSelectionModal,
    );

    const changeProviderLink = getByText('fiat_on_ramp.change_provider');
    fireEvent.press(changeProviderLink);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp_aggregator.providers')).toBeOnTheScreen();
    });

    const backButton = getByTestId('button-icon');
    fireEvent.press(backButton);

    await waitFor(() => {
      expect(getByText('fiat_on_ramp.pay_with')).toBeOnTheScreen();
    });
  });
});
