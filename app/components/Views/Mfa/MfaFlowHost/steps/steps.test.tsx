import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import type {
  MfaFlowState,
  MfaFlowStep,
} from '../../../../../util/identity/mfa/engine/types';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import CodeStep from './CodeStep';
import EmailEntryStep from './EmailEntryStep';
import FailureStep from './FailureStep';
import IntroStep from './IntroStep';
import PickerStep from './PickerStep';
import SuccessStep, { SUCCESS_AUTO_CLOSE_MS } from './SuccessStep';

const reason = { operation: 'test' };

const buildState = <Step extends MfaFlowStep>(
  step: Step,
  extra: Partial<MfaFlowState> = {},
) => ({
  step,
  state: {
    step,
    busy: false,
    progress: { current: 1, total: 1 },
    ...extra,
  },
});

const render = (ui: React.ReactElement) =>
  renderWithProvider(ui, { state: {} });

describe('IntroStep', () => {
  it('lists the missing methods and continues', () => {
    const onAction = jest.fn();
    const { getByText, getByTestId } = render(
      <IntroStep
        {...buildState({ name: 'intro', missing: ['email_otp'] })}
        reason={{ operation: 'test', description: 'Why we ask' }}
        onAction={onAction}
      />,
    );

    expect(getByText('Why we ask')).toBeOnTheScreen();
    expect(getByText('Email')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'continue' });
  });
});

describe('PickerStep', () => {
  it('sends the chosen method', () => {
    const onAction = jest.fn();
    const { getByTestId } = render(
      <PickerStep
        {...buildState({
          name: 'picker',
          purpose: 'verify',
          options: ['passkey', 'email_otp'],
        })}
        reason={reason}
        onAction={onAction}
      />,
    );

    fireEvent.press(
      getByTestId(`${MfaFlowSelectorsIDs.PICKER_OPTION}-email_otp`),
    );
    expect(onAction).toHaveBeenCalledWith({
      type: 'choose',
      method: 'email_otp',
    });
  });
});

describe('EmailEntryStep', () => {
  it('prefills the pending address and submits it trimmed', () => {
    const onAction = jest.fn();
    const { getByTestId } = render(
      <EmailEntryStep
        {...buildState({ name: 'emailEntry', prefillEmail: ' a@b.co ' })}
        reason={reason}
        onAction={onAction}
      />,
    );

    expect(getByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT).props.value).toBe(
      ' a@b.co ',
    );
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({
      type: 'submitEmail',
      email: 'a@b.co',
    });
  });

  it('rejects an invalid address without sending it', () => {
    const onAction = jest.fn();
    const { getByTestId, getByText } = render(
      <EmailEntryStep
        {...buildState({ name: 'emailEntry' })}
        reason={reason}
        onAction={onAction}
      />,
    );

    fireEvent.changeText(getByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT), 'nope');
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));

    expect(getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('shows the error for an address already in use', () => {
    const { getByText } = render(
      <EmailEntryStep
        {...buildState(
          { name: 'emailEntry', prefillEmail: 'a@b.co' },
          { error: 'credential_already_enrolled' },
        )}
        reason={reason}
        onAction={jest.fn()}
      />,
    );

    expect(
      getByText('This email is already in use. Try a different one.'),
    ).toBeOnTheScreen();
  });
});

describe('CodeStep', () => {
  const otp = (codeSent: boolean): MfaFlowStep => ({
    name: 'otp',
    purpose: 'verify',
    email: 'a@b.co',
    codeSent,
  });

  beforeEach(() => {
    jest.useFakeTimers({ now: 1_000_000 });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const renderCode = (
    step: MfaFlowStep,
    extra: Partial<MfaFlowState> = {},
    onAction = jest.fn(),
  ) => {
    const props = buildState(step, extra);
    return {
      onAction,
      ...render(
        <CodeStep
          step={props.step as Extract<MfaFlowStep, { name: 'otp' }>}
          state={props.state}
          reason={reason}
          onAction={onAction}
        />,
      ),
    };
  };

  it('keeps the boxes tappable but does not submit before the code is sent', () => {
    const { onAction, getByText, getByTestId } = renderCode(otp(false), {
      busy: true,
    });

    expect(getByText('Sending code...')).toBeOnTheScreen();
    const input = getByTestId(MfaFlowSelectorsIDs.CODE_INPUT);
    expect(input.props.editable).not.toBe(false);
    fireEvent.changeText(input, '123456');
    expect(onAction).not.toHaveBeenCalled();
  });

  it('stays tappable after the code failed to send', () => {
    const { getByTestId } = renderCode(otp(false), { error: 'server_error' });

    expect(getByTestId(MfaFlowSelectorsIDs.CODE_INPUT).props.editable).not.toBe(
      false,
    );
    expect(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON)).toBeOnTheScreen();
  });

  it('submits once six digits are entered', () => {
    const { onAction, getByTestId, getByText } = renderCode(otp(true));

    expect(getByText('We sent a 6-digit code to a@b.co.')).toBeOnTheScreen();
    fireEvent.changeText(getByTestId(MfaFlowSelectorsIDs.CODE_INPUT), '12a3');
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.changeText(getByTestId(MfaFlowSelectorsIDs.CODE_INPUT), '123456');
    expect(onAction).toHaveBeenCalledWith({
      type: 'submitCode',
      code: '123456',
    });
  });

  it('shows a wrong code and lets the user resend', () => {
    const { onAction, getByText, getByTestId } = renderCode(otp(true), {
      error: 'invalid_code',
    });

    expect(getByText('That code is incorrect. Try again.')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'resend' });
  });

  it('counts down instead of showing the cooldown error', () => {
    const { getByText, queryByTestId } = renderCode(otp(true), {
      error: 'otp_resend_cooldown',
      resendAvailableAt: Date.now() + 30_000,
    });

    expect(getByText('Resend code in 30s')).toBeOnTheScreen();
    expect(queryByTestId(MfaFlowSelectorsIDs.ERROR)).toBeNull();
    expect(queryByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON)).toBeNull();
  });

  it('sends the first code by itself once the cooldown ends', () => {
    const { onAction, getByText } = renderCode(otp(false), {
      error: 'otp_resend_cooldown',
      resendAvailableAt: Date.now() + 2_000,
    });

    expect(getByText('Sending a new code in 2s')).toBeOnTheScreen();
    expect(onAction).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(onAction).toHaveBeenCalledWith({ type: 'resend' });
  });

  it('waits out a new cooldown before sending again', () => {
    const onAction = jest.fn();
    const props = buildState(otp(false), { busy: true });
    const ui = (state: MfaFlowState) => (
      <CodeStep
        step={props.step as Extract<MfaFlowStep, { name: 'otp' }>}
        state={state}
        reason={reason}
        onAction={onAction}
      />
    );
    const { rerender } = render(ui(props.state));

    rerender(
      ui({
        ...props.state,
        busy: false,
        error: 'rate_limited',
        resendAvailableAt: Date.now() + 30_000,
      }),
    );
    expect(onAction).not.toHaveBeenCalled();
  });

  it('says a new code was sent after the old one expired', () => {
    const { getByText } = renderCode(otp(true), { codeResent: true });

    expect(getByText('We sent you a new code.')).toBeOnTheScreen();
  });
});

describe('SuccessStep', () => {
  it('dismisses by itself', () => {
    jest.useFakeTimers();
    const onAction = jest.fn();
    render(
      <SuccessStep
        {...buildState({ name: 'success' })}
        reason={reason}
        onAction={onAction}
      />,
    );

    act(() => {
      jest.advanceTimersByTime(SUCCESS_AUTO_CLOSE_MS);
    });
    expect(onAction).toHaveBeenCalledWith({ type: 'dismiss' });
    jest.useRealTimers();
  });
});

describe('FailureStep', () => {
  it('offers a retry when the error allows it', () => {
    const onAction = jest.fn();
    const { getByTestId, getByText } = render(
      <FailureStep
        {...buildState({
          name: 'failure',
          code: 'server_error',
          canRetry: true,
        })}
        reason={reason}
        onAction={onAction}
      />,
    );

    expect(getByText('Something went wrong. Try again.')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'retry' });
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.SECONDARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'dismiss' });
  });

  it('only offers to close for a final error', () => {
    const { queryByTestId, getByText } = render(
      <FailureStep
        {...buildState({
          name: 'failure',
          code: 'max_identifiers_reached',
          canRetry: false,
        })}
        reason={reason}
        onAction={jest.fn()}
      />,
    );

    expect(
      getByText("You've reached the limit for this method."),
    ).toBeOnTheScreen();
    expect(queryByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON)).toBeNull();
  });
});
