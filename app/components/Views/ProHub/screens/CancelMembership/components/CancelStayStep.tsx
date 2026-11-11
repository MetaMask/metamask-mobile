import React from 'react';
import { TextInput } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import { MAX_STAY_FEEDBACK_LENGTH } from '../CancelMembership.constants';
import CancelStepLayout from './CancelStepLayout';

export interface CancelStayStepProps {
  stayFeedback: string;
  onStayFeedbackChange: (value: string) => void;
  onBack: () => void;
  onKeepMembership: () => void;
  onCancelConfirm: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

/**
 * Step 2 of the cancel survey: optional free-text feedback on what would have
 * made the user stay.
 */
const CancelStayStep = ({
  stayFeedback,
  onStayFeedbackChange,
  onBack,
  onKeepMembership,
  onCancelConfirm,
  isSubmitting,
  errorMessage,
}: CancelStayStepProps) => {
  const tw = useTailwind();

  return (
    <CancelStepLayout
      title={strings('pro_hub.cancel_membership.stay_question')}
      titleTestId={CancelMembershipTestIds.STAY_QUESTION}
      onBack={onBack}
      onKeepMembership={onKeepMembership}
      onCancelConfirm={onCancelConfirm}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
    >
      <TextInput
        value={stayFeedback}
        onChangeText={onStayFeedbackChange}
        maxLength={MAX_STAY_FEEDBACK_LENGTH}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholder={strings(
          'pro_hub.cancel_membership.stay_question_placeholder',
        )}
        style={tw.style(
          'min-h-[96px] rounded-xl border border-muted bg-muted px-3 py-3 text-body-md text-default',
        )}
        testID={CancelMembershipTestIds.STAY_QUESTION_INPUT}
      />
    </CancelStepLayout>
  );
};

export default CancelStayStep;
