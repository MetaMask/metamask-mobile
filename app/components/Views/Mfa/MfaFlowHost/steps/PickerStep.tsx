import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getMethodLabel } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { MfaShield, type StepProps } from './StepLayout';

const PickerStep = ({ step, state, reason, onAction }: StepProps<'picker'>) => (
  <StepLayout
    top={<MfaShield />}
    title={strings('mfa.picker.title')}
    description={
      step.purpose === 'verify' ? reason.verifyDescription : undefined
    }
    error={state.error}
  >
    {step.options.map((method) => (
      <Button
        key={method}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        isDisabled={state.busy}
        onPress={() => onAction({ type: 'choose', method })}
        testID={`${MfaFlowSelectorsIDs.PICKER_OPTION}-${method}`}
      >
        {getMethodLabel(method)}
      </Button>
    ))}
  </StepLayout>
);

export default PickerStep;
