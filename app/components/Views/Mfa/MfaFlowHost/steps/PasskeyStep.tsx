import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

const PasskeyStep = ({ step, state, onAction }: StepProps<'passkey'>) => (
  <StepLayout
    title={strings(
      step.purpose === 'setup'
        ? 'mfa.passkey.title_setup'
        : 'mfa.passkey.title_verify',
    )}
    error={state.error}
    footer={
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        isLoading={state.busy}
        onPress={() => onAction({ type: 'continue' })}
        testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
      >
        {strings('mfa.failure.retry')}
      </Button>
    }
  />
);

export default PasskeyStep;
