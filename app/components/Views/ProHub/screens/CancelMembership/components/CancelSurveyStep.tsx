import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  CancelMembershipTestIds,
  getCancelReasonCheckmarkTestId,
  getCancelReasonTestId,
} from '../CancelMembership.testIds';
import { CANCEL_REASONS } from '../CancelMembership.constants';
import { shuffleCancelReasons } from '../CancelMembership.utils';
import CancelStepLayout from './CancelStepLayout';

interface ReasonItemProps {
  id: string;
  label: string;
  isSelected: boolean;
  onPress: () => void;
}

const ReasonItem = ({ id, label, isSelected, onPress }: ReasonItemProps) => (
  <TouchableOpacity
    onPress={onPress}
    testID={getCancelReasonTestId(id)}
    accessibilityRole="radio"
    accessibilityState={{ selected: isSelected }}
    activeOpacity={1}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={`p-4 rounded-2xl border-2 ${
        isSelected
          ? 'border-border-default bg-background-section'
          : 'border-border-muted'
      }`}
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {label}
      </Text>
      {isSelected && (
        <Icon
          name={IconName.Check}
          size={IconSize.Md}
          color={IconColor.IconDefault}
          testID={getCancelReasonCheckmarkTestId(id)}
        />
      )}
    </Box>
  </TouchableOpacity>
);

export interface CancelSurveyStepProps {
  selectedReasonId: string | null;
  onReasonSelect: (id: string) => void;
  onBack: () => void;
  onKeepMembership: () => void;
  onCancelConfirm: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

/**
 * Step 1 of the cancel survey: pick a cancellation reason. Selecting a reason
 * advances to the stay-question step; "Cancel membership" skips the survey.
 */
const CancelSurveyStep = ({
  selectedReasonId,
  onReasonSelect,
  onBack,
  onKeepMembership,
  onCancelConfirm,
  isSubmitting,
  errorMessage,
}: CancelSurveyStepProps) => {
  const orderedReasons = useMemo(
    () => shuffleCancelReasons(CANCEL_REASONS),
    [],
  );

  return (
    <CancelStepLayout
      title={strings('pro_hub.cancel_membership.title')}
      titleTestId={CancelMembershipTestIds.TITLE}
      onBack={onBack}
      onKeepMembership={onKeepMembership}
      onCancelConfirm={onCancelConfirm}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
    >
      <Box twClassName="gap-y-3" testID={CancelMembershipTestIds.REASONS_LIST}>
        {orderedReasons.map((reason) => (
          <ReasonItem
            key={reason.id}
            id={reason.id}
            label={strings(reason.labelKey)}
            isSelected={selectedReasonId === reason.id}
            onPress={() => onReasonSelect(reason.id)}
          />
        ))}
      </Box>
    </CancelStepLayout>
  );
};

export default CancelSurveyStep;
