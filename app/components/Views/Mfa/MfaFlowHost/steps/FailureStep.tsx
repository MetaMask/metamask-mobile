import React from 'react';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getSpecificErrorMessage } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

const FailureStep = ({ step, state, onAction }: StepProps<'failure'>) => (
  <StepLayout
    top={
      <AvatarIcon
        iconName={IconName.Danger}
        severity={AvatarIconSeverity.Danger}
        size={AvatarIconSize.Xl}
        twClassName="self-center"
      />
    }
    title={strings('mfa.failure.title')}
    // The title already says something went wrong; only a specific reason adds to it.
    description={getSpecificErrorMessage(step.code)}
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
