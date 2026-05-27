import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';

import { ScamQuestionnaire } from './scam-questionnaire';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';

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

jest.spyOn(Linking, 'openURL').mockResolvedValue(true);

const setup = () => {
  const onConfirm = jest.fn();
  const onReject = jest.fn();
  const onBypass = jest.fn();
  const onDismiss = jest.fn();
  const utils = render(
    <ScamQuestionnaire
      onConfirm={onConfirm}
      onReject={onReject}
      onBypass={onBypass}
      onDismiss={onDismiss}
    />,
  );
  return { ...utils, onConfirm, onReject, onBypass, onDismiss };
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

  it('calls onConfirm and fires the clean-completion event when all 3 answers are clean', () => {
    const { getByTestId, onConfirm } = setup();
    answerAllClean(getByTestId);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(mockTrackCompletedClean).toHaveBeenCalledTimes(1);
    expect(mockTrackWarningShown).not.toHaveBeenCalled();
  });

  it('navigates to the scam warning when any answer is a red flag', () => {
    const { getByTestId, onConfirm } = setup();
    answerOneRedFlag(getByTestId);

    expect(getByTestId('scam-warning-stop')).toBeDefined();
    expect(mockTrackWarningShown).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onReject and tracks the stopped event when "Stop this payment" is tapped', () => {
    const { getByTestId, onReject } = setup();
    answerOneRedFlag(getByTestId);

    fireEvent.press(getByTestId('scam-warning-stop'));

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(mockTrackWarningStopped).toHaveBeenCalledTimes(1);
  });

  it('opens the support URL and tracks the support event when "Contact support" is tapped', () => {
    const { getByTestId } = setup();
    answerOneRedFlag(getByTestId);

    fireEvent.press(getByTestId('scam-warning-contact-support'));

    expect(Linking.openURL).toHaveBeenCalledWith(METAMASK_SUPPORT_URL);
    expect(mockTrackWarningContactSupport).toHaveBeenCalledTimes(1);
  });

  it('calls onBypass (not onConfirm) and tracks the proceeded event when the bypass text is tapped', () => {
    const { getByTestId, onBypass, onConfirm } = setup();
    answerOneRedFlag(getByTestId);

    fireEvent.press(getByTestId('scam-warning-proceed'));

    expect(onBypass).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(mockTrackWarningProceeded).toHaveBeenCalledTimes(1);
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
        onConfirm={jest.fn()}
        onReject={jest.fn()}
        onBypass={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );
    expect(mockTrackWarningShown).toHaveBeenCalledTimes(1);
  });
});
