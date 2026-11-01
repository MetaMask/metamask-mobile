import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Keyboard, Linking, TextInput } from 'react-native';
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
import TotpSetupStep from './TotpSetupStep';

const mockOpenSupportWithConsent = jest.fn();
jest.mock('../../../../hooks/useSupportConsent', () => ({
  useSupportConsent: () => ({
    openSupportWithConsent: mockOpenSupportWithConsent,
  }),
}));

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
    const { getAllByText, getByTestId, getByText } = render(
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

    // The options come email first; the passkey still leads.
    expect(
      getAllByText(/^(Verify with Passkey|or|Get a verification code)$/).map(
        (node) => node.props.children,
      ),
    ).toStrictEqual(['Verify with Passkey', 'or', 'Get a verification code']);
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

  it('offers the authenticator app among the other methods', () => {
    const onAction = jest.fn();
    const { getByText } = render(
      <PickerStep
        {...buildState({
          name: 'picker',
          purpose: 'verify',
          options: ['totp', 'email_otp'],
        })}
        reason={reason}
        onAction={onAction}
      />,
    );

    fireEvent.press(getByText('Use authenticator app'));
    expect(onAction).toHaveBeenCalledWith({ type: 'choose', method: 'totp' });
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

  it('links the help article when the email is already in use', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const { getByTestId, getByText } = render(
      <EmailEntryStep
        {...buildState({ name: 'emailEntry' }, { error: 'email_claimed' })}
        reason={reason}
        onAction={jest.fn()}
      />,
    );

    expect(
      getByText('This email is already in use. Try a different one.', {
        exact: false,
      }),
    ).toBeOnTheScreen();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.ERROR_LINK));
    expect(openURL).toHaveBeenCalledWith(
      'https://support.metamask.io/configure/wallet/email-in-use',
    );
  });

  it.each([
    'nope',
    'a@b',
    'a@b..co',
    'a@.co',
    'a b@c.co',
    '.a@b.co',
    'a.@b.co',
    'a..b@c.co',
    '@b.co',
    'a@@b.co',
    'a@b.co.',
  ])('rejects %s without sending it', (address) => {
    const onAction = jest.fn();
    const { getByTestId, getByText } = render(
      <EmailEntryStep
        {...buildState({ name: 'emailEntry' })}
        reason={reason}
        onAction={onAction}
      />,
    );

    fireEvent.changeText(getByTestId(MfaFlowSelectorsIDs.EMAIL_INPUT), address);
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));

    expect(getByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('accepts dots inside the local part', () => {
    const onAction = jest.fn();
    const { getByTestId } = render(
      <EmailEntryStep
        {...buildState({ name: 'emailEntry', prefillEmail: 'first.last@b.co' })}
        reason={reason}
        onAction={onAction}
      />,
    );

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({
      type: 'submitEmail',
      email: 'first.last@b.co',
    });
  });

  it('shows an enrollment failure under the email field', () => {
    const { getByText } = render(
      <EmailEntryStep
        {...buildState({ name: 'emailEntry' }, { error: 'server_error' })}
        reason={reason}
        onAction={jest.fn()}
      />,
    );

    expect(getByText('Something went wrong. Try again.')).toBeOnTheScreen();
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
    method: 'email_otp',
    email: 'a@b.co',
    codeSent,
  });
  const totpCode: MfaFlowStep = {
    name: 'otp',
    purpose: 'verify',
    method: 'totp',
    codeSent: true,
  };

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

  it.each([
    ['visible', true],
    ['reported hidden', false],
  ])(
    'reopens the keyboard on tap while focused, with the keyboard %s',
    (_case, isKeyboardVisible) => {
      jest.spyOn(Keyboard, 'isVisible').mockReturnValue(isKeyboardVisible);
      const { UNSAFE_getByType, getByTestId } = renderCode(otp(true));
      const input = UNSAFE_getByType(TextInput).instance as TextInput;
      jest.spyOn(input, 'isFocused').mockReturnValue(true);
      const blur = jest.spyOn(input, 'blur').mockClear();
      const focus = jest.spyOn(input, 'focus').mockClear();

      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.CODE_TAP_AREA));
      expect(blur).toHaveBeenCalledTimes(1);
      jest.runOnlyPendingTimers();
      expect(focus).toHaveBeenCalled();
    },
  );

  it('focuses the input on tap when it is not focused', () => {
    const { UNSAFE_getByType, getByTestId } = renderCode(otp(true));
    const input = UNSAFE_getByType(TextInput).instance as TextInput;
    jest.spyOn(input, 'isFocused').mockReturnValue(false);
    const blur = jest.spyOn(input, 'blur').mockClear();
    const focus = jest.spyOn(input, 'focus').mockClear();

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.CODE_TAP_AREA));

    expect(blur).not.toHaveBeenCalled();
    expect(focus).toHaveBeenCalledTimes(1);
  });

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

  it('submits a code typed while it was sending once it is sent', () => {
    const onAction = jest.fn();
    const ui = (step: MfaFlowStep, state: MfaFlowState) => (
      <CodeStep
        step={step as Extract<MfaFlowStep, { name: 'otp' }>}
        state={state}
        reason={reason}
        onAction={onAction}
      />
    );
    const sending = buildState(otp(false), { busy: true });
    const { getByTestId, rerender } = render(ui(sending.step, sending.state));
    fireEvent.changeText(getByTestId(MfaFlowSelectorsIDs.CODE_INPUT), '123456');
    expect(onAction).not.toHaveBeenCalled();

    const sent = buildState(otp(true));
    rerender(ui(sent.step, sent.state));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith({
      type: 'submitCode',
      code: '123456',
    });
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

    expect(getByText('This code isn’t correct. Try again')).toBeOnTheScreen();
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

  it('asks for the code from the authenticator app, with nothing to resend', () => {
    const { onAction, getByText, getByTestId, queryByTestId } =
      renderCode(totpCode);

    expect(
      getByText('Open your authenticator app and enter the 6-digit code.'),
    ).toBeOnTheScreen();
    expect(queryByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON)).toBeNull();
    expect(queryByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON)).toBeNull();

    fireEvent.changeText(getByTestId(MfaFlowSelectorsIDs.CODE_INPUT), '123456');
    expect(onAction).toHaveBeenCalledWith({
      type: 'submitCode',
      code: '123456',
    });
  });

  it.each([
    ['email', otp(true)],
    ['authenticator app', totpCode],
  ])(
    'keeps every %s digit visible with a loading indicator while verifying',
    (_method, step) => {
      const onAction = jest.fn();
      const props = buildState(step);
      const ui = (state: MfaFlowState) => (
        <CodeStep
          step={props.step as Extract<MfaFlowStep, { name: 'otp' }>}
          state={state}
          reason={reason}
          onAction={onAction}
        />
      );
      const { getByTestId, getByText, queryByTestId, rerender } = render(
        ui(props.state),
      );
      fireEvent.changeText(
        getByTestId(MfaFlowSelectorsIDs.CODE_INPUT),
        '123456',
      );
      expect(queryByTestId(MfaFlowSelectorsIDs.VERIFYING_INDICATOR)).toBeNull();

      rerender(ui({ ...props.state, busy: true }));

      expect(
        getByTestId(MfaFlowSelectorsIDs.VERIFYING_INDICATOR).props
          .accessibilityLabel,
      ).toBe('Verifying code');
      expect(getByText('6')).toBeOnTheScreen();
    },
  );

  it('offers to try again when the app verification failed to start', () => {
    const { onAction, getByTestId, getByText } = renderCode(
      { ...totpCode, codeSent: false },
      { error: 'server_error' },
    );

    expect(getByText('Something went wrong. Try again.')).toBeOnTheScreen();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'resend' });
  });

  it('shows a cooldown and its countdown before trying again', () => {
    const { getByTestId, getByText } = renderCode(
      { ...totpCode, codeSent: false },
      { error: 'rate_limited', resendAvailableAt: 1_000_000 + 30_000 },
    );

    expect(
      getByText('Too many requests. Wait a moment and try again.'),
    ).toBeOnTheScreen();
    expect(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON)).toHaveTextContent(
      'Try again in 30s',
    );
    expect(getByTestId(MfaFlowSelectorsIDs.RESEND_BUTTON)).toBeDisabled();
  });

  it.each([
    [
      'flow_expired',
      'That took too long. Enter the current code from your app.',
    ],
    ['invalid_code', 'This code isn’t correct. Try again'],
  ] as const)('words %s for the authenticator app', (error, message) => {
    const { getByText } = renderCode(totpCode, { error });

    expect(getByText(message)).toBeOnTheScreen();
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
    const { getByTestId, getByText, queryByText, queryByTestId } = render(
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
    expect(queryByTestId(MfaFlowSelectorsIDs.SECONDARY_BUTTON)).toBeNull();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'retry' });
  });

  it('only offers to close for a final error', () => {
    const onAction = jest.fn();
    const { queryByTestId, getByTestId, getByText } = render(
      <FailureStep
        {...buildState({
          name: 'failure',
          code: 'max_identifiers_reached',
          canRetry: false,
        })}
        reason={reason}
        onAction={onAction}
      />,
    );

    expect(getByText('Something went wrong')).toBeOnTheScreen();
    expect(
      getByText("You've reached the limit for this method."),
    ).toBeOnTheScreen();
    expect(queryByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON)).toBeNull();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.SECONDARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'dismiss' });
  });

  it('sends an error only support can fix to support', () => {
    const onAction = jest.fn();
    const { getByTestId, getByText } = render(
      <FailureStep
        {...buildState({
          name: 'failure',
          code: 'multi_primary_srp',
          canRetry: false,
        })}
        reason={reason}
        onAction={onAction}
      />,
    );

    expect(getByText("We couldn't verify your details")).toBeOnTheScreen();
    expect(getByText('Contact support to continue.')).toBeOnTheScreen();

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));
    const [, url] = mockOpenSupportWithConsent.mock.calls[0];
    expect(new URL(url).searchParams.get('mfa_error')).toBe(
      'multi_primary_srp',
    );

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.SECONDARY_BUTTON));
    expect(onAction).toHaveBeenCalledWith({ type: 'dismiss' });
  });
});

describe('TotpSetupStep', () => {
  const setup = (isRestart = false): MfaFlowStep => ({
    name: 'totpSetup',
    secret: 'JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,QR',
    setupUri: 'otpauth://totp/MetaMask?secret=JBSWY3DPEHPK3PXP',
    isRestart,
  });

  const renderSetup = (step = setup(), onAction = jest.fn()) => {
    const props = buildState(step);
    return {
      onAction,
      ...render(
        <TotpSetupStep
          step={props.step as Extract<MfaFlowStep, { name: 'totpSetup' }>}
          state={props.state}
          reason={reason}
          onAction={onAction}
        />,
      ),
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the setup key in groups and copies it', () => {
    const setString = jest.spyOn(Clipboard, 'setString');
    const { getByTestId, queryByText } = renderSetup();

    expect(getByTestId(MfaFlowSelectorsIDs.TOTP_SETUP_KEY)).toHaveTextContent(
      'JBSW Y3DP EHPK 3PXP',
    );
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.TOTP_COPY_KEY));

    expect(setString).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
    // Only the icon turns green: no message.
    expect(queryByText(/copied/iu)).toBeNull();
  });

  it('includes the setup key in the copy card accessibility label', () => {
    const { getByTestId } = renderSetup();

    const copyCard = getByTestId(MfaFlowSelectorsIDs.TOTP_COPY_KEY);

    expect(copyCard.props.accessibilityLabel).toBe(
      'Setup key, JBSW Y3DP EHPK 3PXP',
    );
    expect(copyCard.props.accessibilityHint).toBe('Copy setup key');
  });

  it('announces when the setup key is copied', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const { getByTestId } = renderSetup();

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.TOTP_COPY_KEY));

    expect(announce).toHaveBeenCalledWith('Setup key copied');
  });

  it('returns to the copy icon after the key was copied', () => {
    jest.useFakeTimers();
    try {
      const { getByTestId, toJSON } = renderSetup();

      fireEvent.press(getByTestId(MfaFlowSelectorsIDs.TOTP_COPY_KEY));
      expect(JSON.stringify(toJSON())).toContain('CopySuccess');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(JSON.stringify(toJSON())).not.toContain('CopySuccess');
    } finally {
      jest.useRealTimers();
    }
  });

  it('copies the setup key from anywhere on its card', () => {
    const setString = jest.spyOn(Clipboard, 'setString');
    const { getByText } = renderSetup();

    fireEvent.press(getByText('Setup key'));

    expect(setString).toHaveBeenCalledWith('JBSWY3DPEHPK3PXP');
  });

  it('shows the setup instructions without another-device button', () => {
    const { queryByText, getByText } = renderSetup();

    expect(
      getByText(
        'In your authenticator app, add a new account and enter the setup key or scan the QR code.',
      ),
    ).toBeOnTheScreen();
    expect(queryByText('Set up on another device')).toBeNull();
  });

  it('cancels from the back button', () => {
    const { onAction, getByTestId } = renderSetup();

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.BACK_BUTTON));

    expect(onAction).toHaveBeenCalledWith({ type: 'cancel' });
  });

  it('shows the QR code from the header', () => {
    const { getByTestId } = renderSetup();

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.TOTP_SHOW_QR));

    expect(getByTestId(MfaFlowSelectorsIDs.TOTP_QR_SHEET)).toBeOnTheScreen();
    expect(getByTestId(MfaFlowSelectorsIDs.TOTP_QR_IMAGE).props.value).toBe(
      'otpauth://totp/MetaMask?secret=JBSWY3DPEHPK3PXP',
    );
  });

  it('continues to the code from the QR code sheet', async () => {
    const { onAction, getByTestId } = renderSetup();
    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.TOTP_SHOW_QR));

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.TOTP_QR_CONTINUE));

    await waitFor(() =>
      expect(onAction).toHaveBeenCalledWith({ type: 'continue' }),
    );
  });

  it('warns that an earlier setup key stopped working', () => {
    const { getByText } = renderSetup(setup(true));

    expect(getByText(/made a new setup key/u)).toBeOnTheScreen();
  });

  it('continues to the code', () => {
    const { onAction, getByTestId } = renderSetup();

    fireEvent.press(getByTestId(MfaFlowSelectorsIDs.PRIMARY_BUTTON));

    expect(onAction).toHaveBeenCalledWith({ type: 'continue' });
  });
});
