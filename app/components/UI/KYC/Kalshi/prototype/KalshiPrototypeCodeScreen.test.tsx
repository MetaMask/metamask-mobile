// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KalshiPrototypeCodeScreen from './KalshiPrototypeCodeScreen';
import { maskEmail } from '../../../../Views/Mfa/labels';
import { MfaFlowSelectorsIDs } from '../../../../Views/Mfa/Mfa.testIds';
import {
  GEORGE_COPY,
  PROTOTYPE_CODE_CHECK_DELAY_MS,
  PROTOTYPE_COPY,
} from './prototypeConstants';

type ScreenProps = Parameters<typeof KalshiPrototypeCodeScreen>[0];

const renderScreen = (overrides: Partial<ScreenProps> = {}) => {
  const onSubmit =
    overrides.onSubmit ??
    jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined);
  const onResend =
    overrides.onResend ??
    jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
  const onBack = jest.fn();

  const screen = renderWithProvider(
    <KalshiPrototypeCodeScreen
      channel="email"
      onSubmit={onSubmit}
      onResend={onResend}
      onBack={onBack}
      {...overrides}
    />,
  );

  return { ...screen, onSubmit, onResend, onBack };
};

describe('KalshiPrototypeCodeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('email', () => {
    it('names Kalshi in the copy, under its header wordmark', () => {
      const { getByText, getByLabelText, queryByText } = renderScreen();

      expect(getByLabelText('Kalshi')).toBeOnTheScreen();
      expect(getByText("Enter Kalshi's verification code")).toBeOnTheScreen();
      expect(
        getByText(
          'Check your email for a 6-digit code from Kalshi. We sent it to d•••@example.com.',
        ),
      ).toBeOnTheScreen();
      expect(queryByText(PROTOTYPE_COPY.lockup)).toBeNull();
    });

    it('goes back from the header', () => {
      const { getByTestId, onBack } = renderScreen();

      fireEvent.press(getByTestId('kalshi-prototype-code-back'));

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it('opens the email entry from the use-a-different-email button', () => {
      const onUseDifferentEmail = jest.fn();
      const { getByTestId, onBack } = renderScreen({ onUseDifferentEmail });

      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PARTNER_EMAIL_LINK));

      expect(onUseDifferentEmail).toHaveBeenCalledTimes(1);
      expect(onBack).not.toHaveBeenCalled();
    });

    it('hides the Kalshi email button once that email is entered', () => {
      const { queryByTestId } = renderScreen({ hideUseDifferentEmail: true });
      expect(
        queryByTestId(MfaFlowSelectorsIDs.PARTNER_EMAIL_LINK),
      ).not.toBeOnTheScreen();
    });

    it('shows the entered address, masked', () => {
      const { getByText } = renderScreen({ email: 'connor@example.com' });
      expect(
        getByText(maskEmail('connor@example.com'), { exact: false }),
      ).toBeOnTheScreen();
    });

    it('goes back from the use-a-different-email button', () => {
      const { getByTestId, getByText, onBack } = renderScreen();

      const differentEmail = getByTestId(
        MfaFlowSelectorsIDs.PARTNER_EMAIL_LINK,
      );
      expect(differentEmail).toHaveTextContent(
        PROTOTYPE_COPY.useDifferentEmail,
      );
      fireEvent.press(differentEmail);

      expect(onBack).toHaveBeenCalledTimes(1);
      expect(getByText('Resend code')).toBeOnTheScreen();
    });

    it('resends the code', async () => {
      const { getByTestId, getByText, onResend } = renderScreen();

      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON));

      expect(onResend).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(getByText('We sent you a new code.')).toBeOnTheScreen(),
      );
    });

    it('accepts the fake code and hands it to the flow', async () => {
      const { getByTestId, onSubmit } = renderScreen();

      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        '123456',
      );
      await act(async () => {
        jest.advanceTimersByTime(PROTOTYPE_CODE_CHECK_DELAY_MS);
      });

      expect(onSubmit).toHaveBeenCalledWith('123456');
    });

    it('refuses a wrong code with George’s copy', async () => {
      const { getByTestId, getByText, onSubmit } = renderScreen({
        onSubmit: jest
          .fn<Promise<void>, [string]>()
          .mockRejectedValue(new Error('refused')),
      });

      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        '999999',
      );
      await act(async () => {
        jest.advanceTimersByTime(PROTOTYPE_CODE_CHECK_DELAY_MS);
      });

      await waitFor(() =>
        expect(getByText(GEORGE_COPY.codeRefused)).toBeOnTheScreen(),
      );
      expect(onSubmit).toHaveBeenCalledWith('999999');
    });
  });

  describe('phone', () => {
    it('matches the email screen: wordmark, Kalshi copy, no co-brand', () => {
      const { getByText, getByLabelText, queryByLabelText, queryByTestId } =
        renderScreen({ channel: 'phone' });

      expect(getByLabelText('Kalshi')).toBeOnTheScreen();
      expect(queryByLabelText(PROTOTYPE_COPY.lockup)).toBeNull();
      expect(getByText(PROTOTYPE_COPY.phoneCode.title)).toBeOnTheScreen();
      expect(
        getByText(
          'Check your messages for a 6-digit code from Kalshi. We sent it to your phone.',
        ),
      ).toBeOnTheScreen();
      expect(queryByTestId(MfaFlowSelectorsIDs.PARTNER_EMAIL_LINK)).toBeNull();
    });

    it('shows the number the user entered', () => {
      const { getByText } = renderScreen({
        channel: 'phone',
        phoneNumber: '+1 (555) 123-4567',
      });

      expect(
        getByText(
          'Check your messages for a 6-digit code from Kalshi. We sent it to +1 (555) 123-4567.',
        ),
      ).toBeOnTheScreen();
    });
  });
});
