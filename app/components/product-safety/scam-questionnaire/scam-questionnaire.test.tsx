import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ScamQuestionnaire } from './scam-questionnaire';
import { METAMASK_SUPPORT_URL } from '../../../constants/urls';
import { confirmSupportConsent } from '../../../util/support';

const mockTrackViewed = jest.fn();
const mockTrackContactSupport = jest.fn();
const mockTrackCompleted = jest.fn();

jest.mock('./useScamQuestionnaireMetrics', () => ({
  useScamQuestionnaireMetrics: () => ({
    trackViewed: mockTrackViewed,
    trackContactSupport: mockTrackContactSupport,
    trackCompleted: mockTrackCompleted,
  }),
}));

jest.mock('../../../util/support', () => ({
  confirmSupportConsent: jest.fn(),
  rejectSupportConsent: jest.fn(),
}));

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

const setup = () => {
  const onCleanPass = jest.fn();
  const onReject = jest.fn();
  const onBypass = jest.fn();
  const onDismiss = jest.fn();
  const utils = render(
    <ScamQuestionnaire
      onCleanPass={onCleanPass}
      onReject={onReject}
      onBypass={onBypass}
      onDismiss={onDismiss}
    />,
  );
  return { ...utils, onCleanPass, onReject, onBypass, onDismiss };
};

const answerAllClean = (
  getByTestId: ReturnType<typeof setup>['getByTestId'],
) => {
  fireEvent.press(getByTestId('scam-questionnaire-option-q1_no'));
  fireEvent.press(getByTestId('scam-questionnaire-continue'));
  fireEvent.press(getByTestId('scam-questionnaire-option-q2_goods'));
  fireEvent.press(getByTestId('scam-questionnaire-continue'));
  fireEvent.press(getByTestId('scam-questionnaire-option-q3_no'));
  fireEvent.press(getByTestId('scam-questionnaire-continue'));
};

const answerOneRedFlag = (
  getByTestId: ReturnType<typeof setup>['getByTestId'],
) => {
  fireEvent.press(getByTestId('scam-questionnaire-option-q1_yes'));
  fireEvent.press(getByTestId('scam-questionnaire-continue'));
  fireEvent.press(getByTestId('scam-questionnaire-option-q2_goods'));
  fireEvent.press(getByTestId('scam-questionnaire-continue'));
  fireEvent.press(getByTestId('scam-questionnaire-option-q3_no'));
  fireEvent.press(getByTestId('scam-questionnaire-continue'));
};

describe('ScamQuestionnaire', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fires the "viewed" event for the first step on render', () => {
    setup();
    expect(mockTrackViewed).toHaveBeenCalledWith(0);
  });

  it('starts on Q1', () => {
    const { getByTestId } = setup();
    expect(getByTestId('scam-questionnaire-option-q1_yes')).toBeDefined();
    expect(getByTestId('scam-questionnaire-option-q1_no')).toBeDefined();
  });

  it('keeps the Continue button disabled until an option is selected', () => {
    const { getByTestId } = setup();
    expect(
      getByTestId('scam-questionnaire-continue').props.accessibilityState
        ?.disabled,
    ).toBe(true);
    fireEvent.press(getByTestId('scam-questionnaire-option-q1_no'));
    expect(
      getByTestId('scam-questionnaire-continue').props.accessibilityState
        ?.disabled,
    ).toBe(false);
  });

  it('calls onCleanPass and fires the clean-completion event when all 3 answers are clean', () => {
    const { getByTestId, onCleanPass } = setup();
    answerAllClean(getByTestId);

    expect(onCleanPass).toHaveBeenCalledTimes(1);
    expect(mockTrackCompleted).toHaveBeenCalledTimes(1);
    expect(mockTrackCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'clean' }),
    );
    expect(mockTrackViewed).not.toHaveBeenCalledWith(3);
  });

  it('navigates to the scam warning when any answer is a red flag', () => {
    const { getByTestId, onCleanPass } = setup();
    answerOneRedFlag(getByTestId);

    expect(getByTestId('scam-warning-stop')).toBeDefined();
    expect(mockTrackViewed).toHaveBeenCalledWith(3);
    expect(onCleanPass).not.toHaveBeenCalled();
  });

  it('calls onReject and tracks the stopped event when "Stop this payment" is tapped', () => {
    const { getByTestId, onReject } = setup();
    answerOneRedFlag(getByTestId);

    fireEvent.press(getByTestId('scam-warning-stop'));

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(mockTrackCompleted).toHaveBeenCalledTimes(1);
    expect(mockTrackCompleted).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'payment_stopped' }),
    );
  });

  it('shows the standalone consent modal when "Contact support" is tapped, tracking only when support actually opens', () => {
    const { getByTestId } = setup();
    answerOneRedFlag(getByTestId);

    fireEvent.press(getByTestId('scam-warning-contact-support'));

    // The consent modal renders above the questionnaire's full-screen modal;
    // merely showing it must not open support or fire the tracker.
    expect(getByTestId('standalone-support-consent-modal').props.visible).toBe(
      true,
    );
    expect(confirmSupportConsent).not.toHaveBeenCalled();
    expect(mockTrackContactSupport).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('standalone-support-consent-confirm-button'));

    expect(confirmSupportConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
      expect.any(Function),
    );
    // Tracking is deferred to the callback the call site hands the consent
    // flow (fired once support actually opens).
    expect(mockTrackContactSupport).not.toHaveBeenCalled();

    const onOpenSupport = jest.mocked(confirmSupportConsent).mock.calls[0][2];
    onOpenSupport?.();
    expect(mockTrackContactSupport).toHaveBeenCalledTimes(1);
  });

  it('shows the warning screen when the bypass link is tapped after answering with a red flag', () => {
    // Full bypass behaviour (including the countdown gate) is covered in
    // scam-warning.test.tsx; here we only assert the questionnaire wires the
    // warning screen up correctly.
    const { getByTestId, onBypass } = setup();
    answerOneRedFlag(getByTestId);

    expect(getByTestId('scam-warning-proceed')).toBeDefined();
    expect(onBypass).not.toHaveBeenCalled();
  });

  it('calls onDismiss when back is tapped on Q1 without firing a tracking event', () => {
    const { getByTestId, onDismiss } = setup();
    const viewedCallsBefore = mockTrackViewed.mock.calls.length;
    fireEvent.press(getByTestId('scam-questionnaire-back'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(mockTrackViewed.mock.calls.length).toBe(viewedCallsBefore);
    expect(mockTrackCompleted).not.toHaveBeenCalled();
  });

  it('walks back to the previous question instead of dismissing when not on Q1', () => {
    const { getByTestId, onDismiss } = setup();
    fireEvent.press(getByTestId('scam-questionnaire-option-q1_no'));
    fireEvent.press(getByTestId('scam-questionnaire-continue'));
    // Now on Q2
    expect(getByTestId('scam-questionnaire-option-q2_goods')).toBeDefined();

    fireEvent.press(getByTestId('scam-questionnaire-back'));
    // Back on Q1
    expect(getByTestId('scam-questionnaire-option-q1_yes')).toBeDefined();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('does not re-fire the viewed event for a step already seen', () => {
    const { getByTestId, rerender } = setup();
    answerOneRedFlag(getByTestId);
    const warningViewedCount = mockTrackViewed.mock.calls.filter(
      (args) => args[0] === 3,
    ).length;
    rerender(
      <ScamQuestionnaire
        onCleanPass={jest.fn()}
        onReject={jest.fn()}
        onBypass={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(
      mockTrackViewed.mock.calls.filter((args) => args[0] === 3).length,
    ).toBe(warningViewedCount);
  });
});
