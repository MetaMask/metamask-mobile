import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
import PasskeyStep from './PasskeyStep';
import PickerStep from './PickerStep';

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
  it('lists every requested method, ticks those set up and continues', () => {
    const onAction = jest.fn();
    const { getByText, getByTestId, queryByText } = render(
      <IntroStep
        {...buildState({
          name: 'intro',
          methods: ['email_otp', 'passkey'],
          missing: ['passkey'],
          email: 'chris@metamask.com',
        })}
        reason={{ operation: 'test', enrollDescription: 'Why we ask' }}
        onAction={onAction}
      />,
    );

    expect(getByText('Why we ask')).toBeOnTheScreen();
    expect(
      getByTestId(`${MfaFlowSelectorsIDs.INTRO_METHOD}-email_otp-done`),
    ).toBeOnTheScreen();
    expect(getByText('c•••@metamask.com')).toBeOnTheScreen();
    expect(
      getByTestId(`${MfaFlowSelectorsIDs.INTRO_METHOD}-passkey`),
    ).toBeOnTheScreen();
    expect(
      getByText('Confirm with your device or password manager'),
    ).toBeOnTheScreen();
    expect(queryByText('Saved to this device')).toBeNull();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'continue' });
  });

  it('describes how each missing method works', () => {
    const { getByText } = render(
      <IntroStep
        {...buildState({
          name: 'intro',
          methods: ['email_otp', 'passkey'],
          missing: ['email_otp', 'passkey'],
        })}
        reason={reason}
        onAction={jest.fn()}
      />,
    );

    expect(
      getByText('Get a 6-digit code sent to your inbox'),
    ).toBeOnTheScreen();
  });

  it('says a set-up passkey is saved, and shows no address for an email it does not know', () => {
    const { getByText, getByTestId } = render(
      <IntroStep
        {...buildState({
          name: 'intro',
          methods: ['email_otp', 'passkey'],
          missing: [],
        })}
        reason={reason}
        onAction={jest.fn()}
      />,
    );

    expect(getByText('Saved to this device')).toBeOnTheScreen();
    expect(
      getByTestId(`${MfaFlowSelectorsIDs.INTRO_METHOD}-email_otp-done`),
    ).toBeOnTheScreen();
  });

  it('shows the generic line when the feature gives none', () => {
    const { getByText } = render(
      <IntroStep
        {...buildState({
          name: 'intro',
          methods: ['email_otp'],
          missing: ['email_otp'],
        })}
        reason={{ operation: 'test', verifyDescription: 'Not this one' }}
        onAction={jest.fn()}
      />,
    );

    expect(
      getByText(/We’ll set up a few ways to confirm it’s you/),
    ).toBeOnTheScreen();
  });
});

describe('PickerStep', () => {
  it('leads with the passkey, then the other methods below an "or"', () => {
    const onAction = jest.fn();
    const { getByTestId, getByText } = render(
      <PickerStep
        {...buildState({
          name: 'picker',
          purpose: 'verify',
          options: ['email_otp', 'passkey'],
        })}
        reason={reason}
        onAction={onAction}
      />,
    );

    expect(getByText('Verify with Passkey')).toBeOnTheScreen();
    expect(getByText('or')).toBeOnTheScreen();
    fireEvent.press(getByText('Get a verification code'));
    expect(onAction).toHaveBeenCalledWith({
      type: 'choose',
      method: 'email_otp',
    });
    fireEvent.press(
      getByTestId(`${MfaFlowSelectorsIDs.PICKER_OPTION}-passkey`),
    );
    expect(onAction).toHaveBeenCalledWith({
      type: 'choose',
      method: 'passkey',
    });
  });

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

  it.each([
    [
      'verify',
      { operation: 'test', verifyDescription: 'To send $20.00' },
      true,
    ],
    ['verify', { operation: 'test' }, false],
    [
      'confirm',
      { operation: 'test', verifyDescription: 'To send $20.00' },
      false,
    ],
  ] as const)(
    'shows the feature line only to verify (%s)',
    (purpose, pickerReason, isShown) => {
      const { queryByText } = render(
        <PickerStep
          {...buildState({
            name: 'picker',
            purpose,
            options: ['passkey', 'email_otp'],
          })}
          reason={pickerReason}
          onAction={jest.fn()}
        />,
      );

      expect(queryByText('To send $20.00') !== null).toBe(isShown);
    },
  );
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

  it.each(['nope', 'a@b', 'a@b..co', 'a@.co', 'a b@c.co'])(
    'rejects %s without sending it',
    (address) => {
      const onAction = jest.fn();
      const { getByTestId, getByText } = render(
        <EmailEntryStep
          {...buildState({ name: 'emailEntry' })}
          reason={reason}
          onAction={onAction}
        />,
      );

      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT),
        address,
      );
      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));

      expect(getByText('Enter a valid email address.')).toBeOnTheScreen();
      expect(onAction).not.toHaveBeenCalled();
    },
  );

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

    expect(
      getByText(
        'We sent a 6-digit code to a•••@b.co. Enter it below to verify your email.',
      ),
    ).toBeOnTheScreen();
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

    expect(
      getByText('That code isn’t right. Check it and try again.'),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'resend' });
  });

  it('counts down instead of showing the cooldown error', () => {
    const { onAction, getByText, getByTestId, queryByTestId } = renderCode(
      otp(true),
      {
        error: 'otp_resend_cooldown',
        resendAvailableAt: Date.now() + 30_000,
      },
    );

    expect(getByText('Resend code in 30s')).toBeOnTheScreen();
    expect(queryByTestId(MfaFlowSelectorsIDs.ERROR)).toBeNull();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON));
    expect(onAction).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(getByText('Resend code in 29s')).toBeOnTheScreen();
  });

  it('lets the user resend once the cooldown ends, without its error', () => {
    const { onAction, getByText, queryByTestId } = renderCode(otp(true), {
      error: 'rate_limited',
      resendAvailableAt: Date.now() + 1_000,
    });

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(queryByTestId(MfaFlowSelectorsIDs.ERROR)).toBeNull();
    fireEvent.press(getByText('Resend code'));
    expect(onAction).toHaveBeenCalledWith({ type: 'resend' });
  });

  it('shows a cooldown that came without a wait time', () => {
    const { getByText } = renderCode(otp(true), { error: 'rate_limited' });

    expect(
      getByText('Too many requests. Wait a moment and try again.'),
    ).toBeOnTheScreen();
  });

  it('pastes a copied code and submits it', async () => {
    jest.spyOn(Clipboard, 'getString').mockResolvedValue('Code: 123456');
    const { onAction, getByTestId } = renderCode(otp(true));

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PASTE_BUTTON));

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith({
        type: 'submitCode',
        code: '123456',
      }),
    );
  });

  it('offers a new code once the one on screen expired', () => {
    const { onAction, getByText } = renderCode(otp(true), {
      error: 'flow_expired',
    });

    expect(
      getByText('Your verification code expired, get a new code.'),
    ).toBeOnTheScreen();
    fireEvent.press(getByText('Get new code'));
    expect(onAction).toHaveBeenCalledWith({ type: 'resend' });
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

describe('PasskeyStep', () => {
  it('shows why the passkey failed and tries again', () => {
    const onAction = jest.fn();
    const { getByText, getByTestId } = render(
      <PasskeyStep
        {...buildState(
          { name: 'passkey', purpose: 'verify' },
          { error: 'passkey_ceremony_cancelled' },
        )}
        reason={reason}
        onAction={onAction}
      />,
    );

    expect(getByText('Use your passkey')).toBeOnTheScreen();
    expect(getByText('Passkey request was cancelled.')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'continue' });
  });
});

describe('FailureStep', () => {
  it('offers a retry when the error allows it', () => {
    const onAction = jest.fn();
    const { getByTestId, getByText, queryByText } = render(
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

    expect(getByText('Something went wrong')).toBeOnTheScreen();
    expect(queryByText('Something went wrong. Try again.')).toBeNull();
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
