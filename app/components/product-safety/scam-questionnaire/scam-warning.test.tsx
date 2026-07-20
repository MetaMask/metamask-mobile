import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import { ScamWarning } from './scam-warning';
import { PROCEED_DELAY_SECONDS } from './scam-questionnaire.constants';
import { METAMASK_SUPPORT_URL } from '../../../constants/urls';

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

const mockOpenSupportWithConsent = jest.fn(
  (open: (url: string) => void, baseUrl?: string) => open(baseUrl ?? ''),
);
jest.mock('../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

const setup = () => {
  const onStop = jest.fn();
  const onContactSupport = jest.fn();
  const onProceed = jest.fn();
  const utils = render(
    <ScamWarning
      onStop={onStop}
      onContactSupport={onContactSupport}
      onProceed={onProceed}
    />,
  );
  return { ...utils, onStop, onContactSupport, onProceed };
};

const advanceCountdown = () => {
  act(() => {
    jest.advanceTimersByTime(PROCEED_DELAY_SECONDS * 1000);
  });
};

describe('ScamWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onStop when "Stop this payment" is tapped', () => {
    const { getByTestId, onStop } = setup();
    fireEvent.press(getByTestId('scam-warning-stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('opens the support URL and calls onContactSupport when "Contact support" is tapped', () => {
    const { getByTestId, onContactSupport } = setup();
    fireEvent.press(getByTestId('scam-warning-contact-support'));
    expect(onContactSupport).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
  });

  it('keeps the bypass link disabled and ignores taps while the countdown runs', () => {
    const { getByTestId, getByText, onProceed } = setup();

    const proceed = getByTestId('scam-warning-proceed');
    expect(proceed.props.accessibilityState?.disabled).toBe(true);
    expect(
      getByText(`Continue anyway in ${PROCEED_DELAY_SECONDS}s`),
    ).toBeDefined();

    fireEvent.press(proceed);
    expect(onProceed).not.toHaveBeenCalled();
  });

  it('decrements the live countdown copy each second', () => {
    const { getByText } = setup();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(
      getByText(`Continue anyway in ${PROCEED_DELAY_SECONDS - 1}s`),
    ).toBeDefined();
  });

  it('enables the bypass link and calls onProceed once the countdown finishes', () => {
    const { getByTestId, getByText, onProceed } = setup();

    advanceCountdown();

    const proceed = getByTestId('scam-warning-proceed');
    expect(proceed.props.accessibilityState?.disabled).toBe(false);
    expect(getByText('Ignore risks and continue anyway')).toBeDefined();

    fireEvent.press(proceed);
    expect(onProceed).toHaveBeenCalledTimes(1);
  });
});
