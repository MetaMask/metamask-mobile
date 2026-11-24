import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import type {
  MfaFlowAction,
  MfaFlowState,
} from '../../../../../util/identity/mfa/engine/types';
import { MfaFlowSelectorsIDs } from '../../Mfa.testIds';
import PhoneNumberEntry from '../../PhoneNumberEntry/PhoneNumberEntry';
import type { PhoneNumberValue } from '../../PhoneNumberEntry/phone';
import { StepError } from './StepLayout';

/** The action this step sends with the number the user entered. */
export interface SubmitPhoneAction {
  type: 'submitPhone';
  phone: PhoneNumberValue;
}

/**
 * The props every step screen gets, for a step the engine does not plan yet:
 * the SMS method has no backend, so `phoneEntry` is not part of
 * `MfaFlowStep`. Once it is, this becomes `StepProps<'phoneEntry'>`.
 */
export interface PhoneEntryStepProps {
  step: { name: 'phoneEntry'; prefillPhone?: string };
  state: Pick<MfaFlowState, 'busy' | 'error'>;
  onAction: (action: MfaFlowAction | SubmitPhoneAction) => void;
}

/**
 * The MFA flow's phone number step: `PhoneNumberEntry` with the flow's copy,
 * its state and its actions.
 */
const PhoneEntryStep = ({ step, state, onAction }: PhoneEntryStepProps) => (
  <PhoneNumberEntry
    title={strings('mfa.phone_entry.title')}
    description={strings('mfa.phone_entry.description')}
    ctaLabel={strings('mfa.phone_entry.continue')}
    disclaimer={strings('mfa.phone_entry.disclaimer')}
    initialValue={step.prefillPhone}
    isSubmitting={state.busy}
    error={
      state.error ? (
        <StepError code={state.error} onAction={onAction} />
      ) : undefined
    }
    onSubmit={async (phone) => onAction({ type: 'submitPhone', phone })}
    testIdPrefix={MfaFlowSelectorsIDs.PHONE_ENTRY_PREFIX}
  />
);

export default PhoneEntryStep;
