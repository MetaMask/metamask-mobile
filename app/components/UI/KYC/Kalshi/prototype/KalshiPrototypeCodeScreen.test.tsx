// PROTOTYPE-DO-NOT-MERGE
import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import KalshiPrototypeCodeScreen from './KalshiPrototypeCodeScreen';
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
        getByText('Kalshi sent a 6-digit code to d•••@example.com.'),
      ).toBeOnTheScreen();
      expect(queryByText(PROTOTYPE_COPY.lockup)).toBeNull();
    });

    it('goes back from the header', () => {
      const { getByTestId, onBack } = renderScreen();

      fireEvent.press(getByTestId('kalshi-prototype-code-back'));

      expect(onBack).toHaveBeenCalledTimes(1);
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
    it('keeps the co-brand and George’s phone-code copy', () => {
      const { getByText, getByLabelText, queryByLabelText, queryByTestId } =
        renderScreen({ channel: 'phone' });

      expect(getByLabelText(PROTOTYPE_COPY.lockup)).toBeOnTheScreen();
      expect(queryByLabelText('Kalshi')).toBeNull();
      expect(getByText(GEORGE_COPY.phoneCode.body)).toBeOnTheScreen();
      expect(queryByTestId(MfaFlowSelectorsIDs.PARTNER_EMAIL_LINK)).toBeNull();
    });
  });
});
