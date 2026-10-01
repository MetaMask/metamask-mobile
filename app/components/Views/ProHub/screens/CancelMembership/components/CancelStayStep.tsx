import React from 'react';
import { TextInput } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { CancelMembershipTestIds } from '../CancelMembership.testIds';
import {
  MAX_STAY_FEEDBACK_LENGTH,
  OTHER_REASON_ID,
} from '../CancelMembership.constants';
import CancelStepLayout from './CancelStepLayout';

export interface CancelStayStepProps {
  selectedReasonId: string | null;
  stayFeedback: string;
  otherReasonText: string;
  onStayFeedbackChange: (value: string) => void;
  onOtherReasonChange: (value: string) => void;
  onBack: () => void;
  onKeepMembership: () => void;
  onCancelConfirm: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

/**
 * Step 2 of the cancel survey: optional free-text feedback on what would have
 * made the user stay. When "Other" was picked, the reason description input
 * is shown above it.
 */
const CancelStayStep = ({
  selectedReasonId,
  stayFeedback,
  otherReasonText,
  onStayFeedbackChange,
  onOtherReasonChange,
  onBack,
  onKeepMembership,
  onCancelConfirm,
  isSubmitting,
  errorMessage,
}: CancelStayStepProps) => {
  const tw = useTailwind();
  const showOtherReasonInput = selectedReasonId === OTHER_REASON_ID;
  const inputStyle = tw.style(
    'min-h-[96px] rounded-xl border border-muted bg-muted px-3 py-3 text-body-md text-default',
  );

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
      <Box twClassName="gap-y-3">
        {showOtherReasonInput && (
          <TextInput
            value={otherReasonText}
            onChangeText={onOtherReasonChange}
            maxLength={MAX_STAY_FEEDBACK_LENGTH}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholder={strings(
              'pro_hub.cancel_membership.reason_other_placeholder',
            )}
            style={inputStyle}
            testID={CancelMembershipTestIds.OTHER_REASON_INPUT}
          />
        )}
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
          style={inputStyle}
          testID={CancelMembershipTestIds.STAY_QUESTION_INPUT}
        />
      </Box>
    </CancelStepLayout>
  );
};

export default CancelStayStep;
