import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import RampErrorModal, { type RampErrorModalParams } from './RampErrorModal';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

const mockOnCloseBottomSheet = jest.fn();
const mockOnRetry = jest.fn();

let mockRouteParams: RampErrorModalParams = {
  errorType: 'quote_fetch',
  isCritical: true,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

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

function render(params: RampErrorModalParams) {
  mockRouteParams = params;
  return renderScreen(
    RampErrorModal,
    {
      name: Routes.SHEET.RAMP_ERROR_MODAL,
    },
    {
      state: initialRootState,
    },
  );
}

describe('RampErrorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Critical Errors', () => {
    it('renders quote fetch error with contact support button', () => {
      const { toJSON, getByText, getByTestId } = render({
        errorType: 'quote_fetch',
        isCritical: true,
      });

      expect(toJSON()).toMatchSnapshot();
      expect(getByText('Unable to fetch quotes')).toBeTruthy();
      expect(
        getByText(
          "We couldn't load quotes from providers. Please check your connection and try again.",
        ),
      ).toBeTruthy();
      expect(
        getByTestId('ramp-error-modal-contact-support-button'),
      ).toBeTruthy();
      expect(getByTestId('ramp-error-modal-got-it-button')).toBeTruthy();
    });

    it('renders widget URL failed error with contact support button', () => {
      const { getByText, getByTestId } = render({
        errorType: 'widget_url_failed',
        isCritical: true,
      });

      expect(getByText('Unable to continue')).toBeTruthy();
      expect(
        getByText(
          "We couldn't load the provider page. Please try again or contact support if the issue persists.",
        ),
      ).toBeTruthy();
      expect(
        getByTestId('ramp-error-modal-contact-support-button'),
      ).toBeTruthy();
    });

    it('renders widget URL missing error with contact support button', () => {
      const { getByText, getByTestId } = render({
        errorType: 'widget_url_missing',
        isCritical: true,
      });

      expect(getByText('Provider unavailable')).toBeTruthy();
      expect(
        getByText(
          'This provider is temporarily unavailable. Please try a different provider or contact support.',
        ),
      ).toBeTruthy();
      expect(
        getByTestId('ramp-error-modal-contact-support-button'),
      ).toBeTruthy();
    });

    it('opens support URL when contact support button is pressed', () => {
      const { getByTestId } = render({
        errorType: 'quote_fetch',
        isCritical: true,
      });

      const contactSupportButton = getByTestId(
        'ramp-error-modal-contact-support-button',
      );
      fireEvent.press(contactSupportButton);

      expect(Linking.openURL).toHaveBeenCalledWith(
        'https://support.metamask.io',
      );
    });
  });

  describe('Non-Critical Errors', () => {
    it('renders no quotes error with try again button', () => {
      const { toJSON, getByText, getByTestId } = render({
        errorType: 'no_quotes',
        isCritical: false,
        onRetry: mockOnRetry,
      });

      expect(toJSON()).toMatchSnapshot();
      expect(getByText('No quotes available')).toBeTruthy();
      expect(
        getByText(
          'There are currently no quotes available for this amount and payment method. Try adjusting your amount or selecting a different payment method.',
        ),
      ).toBeTruthy();
      expect(getByTestId('ramp-error-modal-try-again-button')).toBeTruthy();
      expect(getByTestId('ramp-error-modal-got-it-button')).toBeTruthy();
    });

    it('calls onRetry and closes modal when try again button is pressed', () => {
      const { getByTestId } = render({
        errorType: 'no_quotes',
        isCritical: false,
        onRetry: mockOnRetry,
      });

      const tryAgainButton = getByTestId('ramp-error-modal-try-again-button');
      fireEvent.press(tryAgainButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });

  describe('Common Actions', () => {
    it('closes modal when close button is pressed', () => {
      const { getByTestId } = render({
        errorType: 'quote_fetch',
        isCritical: true,
      });

      const closeButton = getByTestId('ramp-error-modal-close-button');
      fireEvent.press(closeButton);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('closes modal when got it button is pressed', () => {
      const { getByTestId } = render({
        errorType: 'quote_fetch',
        isCritical: true,
      });

      const gotItButton = getByTestId('ramp-error-modal-got-it-button');
      fireEvent.press(gotItButton);

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });
  });
});
