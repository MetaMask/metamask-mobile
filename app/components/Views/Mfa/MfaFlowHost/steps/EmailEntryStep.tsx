import React, { useState } from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailEntryStep = ({ step, state, onAction }: StepProps<'emailEntry'>) => {
  const [email, setEmail] = useState(step.prefillEmail ?? '');
  const [showInvalid, setShowInvalid] = useState(false);
  const trimmed = email.trim();

  const submit = () => {
    if (!EMAIL_PATTERN.test(trimmed)) {
      setShowInvalid(true);
      return;
    }
    onAction({ type: 'submitEmail', email: trimmed });
  };

  return (
    <StepLayout
      title={strings('mfa.email_entry.title')}
      description={strings('mfa.email_entry.description')}
      error={state.error}
      footer={
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={state.busy}
          isDisabled={trimmed.length === 0}
          onPress={submit}
          testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
        >
          {strings('mfa.email_entry.continue')}
        </Button>
      }
    >
      <TextField
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setShowInvalid(false);
        }}
        placeholder={strings('mfa.email_entry.placeholder')}
        isError={showInvalid || state.error !== undefined}
        autoFocus
        inputProps={{
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          autoCorrect: false,
          autoComplete: 'email',
          textContentType: 'emailAddress',
          returnKeyType: 'done',
          onSubmitEditing: submit,
          testID: MfaFlowSelectorsIDs.EMAIL_INPUT,
        }}
      />
      {showInvalid ? (
        <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
          {strings('mfa.email_entry.invalid')}
        </Text>
      ) : null}
    </StepLayout>
  );
};

export default EmailEntryStep;
