import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import PaymentSelectionModal from './PaymentSelectionModal';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

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

const mockUseParams = jest.fn();
jest.mock('../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: () => mockUseParams(),
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
    mockUseParams.mockReturnValue({});
  });

  it('renders correctly and matches snapshot', () => {
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

  it('calls onCloseBottomSheet when payment method is pressed', async () => {
    const { getAllByText } = renderWithProvider(PaymentSelectionModal);

    const paymentMethodItems = getAllByText('Debit or Credit');
    fireEvent.press(paymentMethodItems[0]);

    await waitFor(() => {
      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });
  });
});
