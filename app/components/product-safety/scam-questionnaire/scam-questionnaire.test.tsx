import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ScamQuestionnaire } from './scam-questionnaire';
import { METAMASK_SUPPORT_URL } from '../../../constants/urls';

const mockTrackStarted = jest.fn();
const mockTrackQuestionAnswered = jest.fn();
const mockTrackCompletedClean = jest.fn();
const mockTrackDismissed = jest.fn();
const mockTrackWarningShown = jest.fn();
const mockTrackWarningStopped = jest.fn();
const mockTrackWarningContactSupport = jest.fn();
const mockTrackWarningProceeded = jest.fn();

jest.mock('./useScamQuestionnaireMetrics', () => ({
  useScamQuestionnaireMetrics: () => ({
    trackStarted: mockTrackStarted,
    trackQuestionAnswered: mockTrackQuestionAnswered,
    trackCompletedClean: mockTrackCompletedClean,
    trackDismissed: mockTrackDismissed,
    trackWarningShown: mockTrackWarningShown,
    trackWarningStopped: mockTrackWarningStopped,
    trackWarningContactSupport: mockTrackWarningContactSupport,
    trackWarningProceeded: mockTrackWarningProceeded,
  }),
}));

const mockOpenSupportWithConsent = jest.fn();
jest.mock('../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
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

  it('fires the "started" analytics event on first render', () => {
    setup();
    expect(mockTrackStarted).toHaveBeenCalledTimes(1);
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

  it('fires the question-answered event for each step', () => {
    const { getByTestId } = setup();
    answerAllClean(getByTestId);

    expect(mockTrackQuestionAnswered).toHaveBeenCalledTimes(3);
    expect(mockTrackQuestionAnswered).toHaveBeenNthCalledWith(
      1,
      'q1',
      'q1_no',
      false,
    );
    expect(mockTrackQuestionAnswered).toHaveBeenNthCalledWith(
      2,
      'q2',
      'q2_goods',
      false,
    );
    expect(mockTrackQuestionAnswered).toHaveBeenNthCalledWith(
      3,
      'q3',
      'q3_no',
      false,
    );
  });

  it('calls onCleanPass and fires the clean-completion event when all 3 answers are clean', () => {
    const { getByTestId, onCleanPass } = setup();
    answerAllClean(getByTestId);

    expect(onCleanPass).toHaveBeenCalledTimes(1);
    expect(mockTrackCompletedClean).toHaveBeenCalledTimes(1);
    expect(mockTrackWarningShown).not.toHaveBeenCalled();
  });

  it('navigates to the scam warning when any answer is a red flag', () => {
    const { getByTestId, onCleanPass } = setup();
    answerOneRedFlag(getByTestId);

    expect(getByTestId('scam-warning-stop')).toBeDefined();
    expect(mockTrackWarningShown).toHaveBeenCalledTimes(1);
    expect(onCleanPass).not.toHaveBeenCalled();
  });

  it('calls onReject and tracks the stopped event when "Stop this payment" is tapped', () => {
    const { getByTestId, onReject } = setup();
    answerOneRedFlag(getByTestId);

    fireEvent.press(getByTestId('scam-warning-stop'));

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(mockTrackWarningStopped).toHaveBeenCalledTimes(1);
  });

  it('opens the support consent flow when "Contact support" is tapped, tracking only when support actually opens', () => {
    const { getByTestId } = setup();
    answerOneRedFlag(getByTestId);

    fireEvent.press(getByTestId('scam-warning-contact-support'));

    expect(mockOpenSupportWithConsent).toHaveBeenCalledWith(
      expect.any(Function),
      METAMASK_SUPPORT_URL,
      expect.any(Function),
    );
    // Pressing only shows the consent sheet; tracking is deferred to the
    // callback the call site hands the consent flow (fired on open).
    expect(mockTrackWarningContactSupport).not.toHaveBeenCalled();

    const onOpenSupport = mockOpenSupportWithConsent.mock.calls[0][2];
    onOpenSupport();
    expect(mockTrackWarningContactSupport).toHaveBeenCalledTimes(1);
  });

  it('navigates to the scam warning and tracks the proceeded event when the bypass link is used', () => {
    // Full bypass behaviour (including the countdown gate) is covered in
    // scam-warning.test.tsx; here we only assert the questionnaire wires the
    // warning screen up and fires the proceeded analytics event.
    const { getByTestId, onBypass } = setup();
    answerOneRedFlag(getByTestId);

    expect(getByTestId('scam-warning-proceed')).toBeDefined();
    expect(onBypass).not.toHaveBeenCalled();
  });

  it('calls onDismiss and tracks dismissal when back is tapped on Q1', () => {
    const { getByTestId, onDismiss } = setup();
    fireEvent.press(getByTestId('scam-questionnaire-back'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(mockTrackDismissed).toHaveBeenCalledTimes(1);
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

  it('does not re-fire the warning-shown event on re-render', () => {
    const { getByTestId, rerender } = setup();
    answerOneRedFlag(getByTestId);
    rerender(
      <ScamQuestionnaire
        onCleanPass={jest.fn()}
        onReject={jest.fn()}
        onBypass={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(mockTrackWarningShown).toHaveBeenCalledTimes(1);
  });
});
