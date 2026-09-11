import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import { ScamWarning } from './scam-warning';
import { PROCEED_DELAY_SECONDS } from './scam-questionnaire.constants';
import { METAMASK_SUPPORT_URL } from '../../../constants/urls';
import {
  confirmSupportConsent,
  rejectSupportConsent,
} from '../../../util/support';

jest.mock('../../../util/support', () => ({
  confirmSupportConsent: jest.fn(),
  rejectSupportConsent: jest.fn(),
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
    // Recreate the spy per test so state never leaks across tests/files.
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('calls onStop when "Stop this payment" is tapped', () => {
    const { getByTestId, onStop } = setup();
    fireEvent.press(getByTestId('scam-warning-stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('shows the standalone consent modal above the questionnaire when "Contact support" is tapped', () => {
    const { getByTestId, queryByTestId, onContactSupport } = setup();

    expect(queryByTestId('standalone-support-consent-modal')).toBeNull();

    fireEvent.press(getByTestId('scam-warning-contact-support'));

    expect(getByTestId('standalone-support-consent-modal')).toBeOnTheScreen();
    // Merely showing the consent modal must not open support or fire the
    // tracker; both are deferred to the consent choice.
    expect(confirmSupportConsent).not.toHaveBeenCalled();
    expect(rejectSupportConsent).not.toHaveBeenCalled();
    expect(onContactSupport).not.toHaveBeenCalled();
  });

  it('confirms consent with the tracker as callback and hides the modal', () => {
    const { getByTestId, queryByTestId, onContactSupport } = setup();
    fireEvent.press(getByTestId('scam-warning-contact-support'));

    fireEvent.press(getByTestId('standalone-support-consent-confirm-button'));

    expect(confirmSupportConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
      onContactSupport,
    );
    expect(queryByTestId('standalone-support-consent-modal')).toBeNull();
  });

  it('rejects consent with the tracker as callback and hides the modal', () => {
    const { getByTestId, queryByTestId, onContactSupport } = setup();
    fireEvent.press(getByTestId('scam-warning-contact-support'));

    fireEvent.press(getByTestId('standalone-support-consent-reject-button'));

    expect(rejectSupportConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
      onContactSupport,
    );
    expect(queryByTestId('standalone-support-consent-modal')).toBeNull();
  });

  it('dismisses the consent modal without opening support', () => {
    const { getByTestId, queryByTestId } = setup();
    fireEvent.press(getByTestId('scam-warning-contact-support'));

    fireEvent(
      getByTestId('standalone-support-consent-modal'),
      'onRequestClose',
    );

    expect(queryByTestId('standalone-support-consent-modal')).toBeNull();
    expect(confirmSupportConsent).not.toHaveBeenCalled();
    expect(rejectSupportConsent).not.toHaveBeenCalled();
  });

  it('opens the support URL when the consent flow invokes the opener', () => {
    const { getByTestId } = setup();
    fireEvent.press(getByTestId('scam-warning-contact-support'));
    fireEvent.press(getByTestId('standalone-support-consent-confirm-button'));

    const open = jest.mocked(confirmSupportConsent).mock.calls[0][0];
    open(METAMASK_SUPPORT_URL);
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
