import React from 'react';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { getMethodLabel } from '../../labels';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import StepLayout, { type StepProps } from './StepLayout';

const PickerStep = ({ step, state, reason, onAction }: StepProps<'picker'>) => (
  <StepLayout
    title={strings('mfa.picker.title')}
    description={reason.description ?? strings('mfa.picker.description')}
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
