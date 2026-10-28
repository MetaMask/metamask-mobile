import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PaymentFailedSheet from './PaymentFailedSheet';
import { PaymentFailedSheetTestIds } from './PaymentFailedSheet.testIds';

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockNavigate = jest.fn();
const mockOnClose = jest.fn();

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

jest.mock('../../../../../util/haptics', () => ({
  playNotification: jest.fn().mockResolvedValue(undefined),
  NotificationMoment: {
    Error: 'error',
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
      }: {
        children: React.ReactNode;
        testID?: string;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));

      return ReactActual.createElement(View, { testID }, children);
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

describe('PaymentFailedSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the failed payment copy', () => {
    const { getByTestId } = renderWithProvider(
      <PaymentFailedSheet onClose={mockOnClose} />,
    );

    expect(getByTestId(PaymentFailedSheetTestIds.TITLE)).toHaveTextContent(
      strings('pro_subscription.payment.failed_title'),
    );
    expect(getByTestId(PaymentFailedSheetTestIds.BODY)).toHaveTextContent(
      strings('pro_subscription.payment.failed_body'),
    );
    expect(getByTestId(PaymentFailedSheetTestIds.TRY_AGAIN)).toHaveTextContent(
      strings('pro_subscription.payment.try_again'),
    );
  });

  it('opens add money when Try again is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <PaymentFailedSheet onClose={mockOnClose} />,
    );

    fireEvent.press(getByTestId(PaymentFailedSheetTestIds.TRY_AGAIN));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
    });
  });
});
