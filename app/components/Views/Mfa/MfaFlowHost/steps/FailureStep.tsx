import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getErrorMessage } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

const FailureStep = ({ step, state, onAction }: StepProps<'failure'>) => (
  <StepLayout
    top={
      <Icon
        name={IconName.Danger}
        color={IconColor.ErrorDefault}
        size={IconSize.Xl}
      />
    }
    title={strings('mfa.failure.title')}
    description={getErrorMessage(step.code)}
    footer={
      <>
        {step.canRetry ? (
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isLoading={state.busy}
            onPress={() => onAction({ type: 'retry' })}
            testID={MfaFlowSelectorsIDs.PRIMARY_BUTTON}
          >
            {strings('mfa.failure.retry')}
          </Button>
        ) : null}
        <Button
          variant={
            step.canRetry ? ButtonVariant.Secondary : ButtonVariant.Primary
          }
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={state.busy}
          onPress={() => onAction({ type: 'dismiss' })}
          testID={MfaFlowSelectorsIDs.SECONDARY_BUTTON}
        >
          {strings('mfa.failure.close')}
        </Button>
      </>
    }
  />
);

export default FailureStep;
