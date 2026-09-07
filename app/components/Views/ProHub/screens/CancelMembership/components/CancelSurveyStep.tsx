import React, { useCallback, useMemo, useRef } from 'react';
import {
  type LayoutChangeEvent,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  ButtonIcon,
  ButtonSize,
  HeaderBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  CancelMembershipTestIds,
  getCancelReasonCheckmarkTestId,
  getCancelReasonTestId,
} from '../CancelMembership.testIds';
import {
  CANCEL_REASONS,
  MAX_STAY_FEEDBACK_LENGTH,
  MOCK_CANCEL_STATS,
} from '../CancelMembership.constants';
import { shuffleCancelReasons } from '../CancelMembership.utils';

/**
 * Leaves the selected reason partially visible above the stay question so the
 * auto-scroll reads as continuous rather than a jump.
 */
const STAY_QUESTION_SCROLL_INSET = 16;

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
  stayFeedback: string;
  onReasonSelect: (id: string) => void;
  onStayFeedbackChange: (value: string) => void;
  onBack: () => void;
  onKeepMembership: () => void;
  onCancelConfirm: () => void;
}

const CancelSurveyStep = ({
  selectedReasonId,
  stayFeedback,
  onReasonSelect,
  onStayFeedbackChange,
  onBack,
  onKeepMembership,
  onCancelConfirm,
}: CancelSurveyStepProps) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledToStayQuestionRef = useRef(false);
  const showStayQuestion = selectedReasonId !== null;
  const orderedReasons = useMemo(
    () => shuffleCancelReasons(CANCEL_REASONS),
    [],
  );

  // The stay question mounts below the stats card and six reason rows, so on
  // shorter devices it appears off-screen. Scroll to it once: onLayout also
  // fires as the multiline input grows, and re-scrolling mid-typing would
  // yank the field out from under the user.
  const handleStayQuestionLayout = useCallback((event: LayoutChangeEvent) => {
    if (hasScrolledToStayQuestionRef.current) {
      return;
    }
    hasScrolledToStayQuestionRef.current = true;
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, event.nativeEvent.layout.y - STAY_QUESTION_SCROLL_INSET),
      animated: true,
    });
  }, []);

  return (
    <>
      <HeaderBase
        twClassName="px-4"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={onBack}
            accessibilityLabel={strings('navigation.back')}
            testID={CancelMembershipTestIds.BACK_BUTTON}
          />
        }
      />

      <ScrollView
        ref={scrollViewRef}
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pt-2 pb-6')}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title + subtitle */}
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="mb-1"
          testID={CancelMembershipTestIds.TITLE}
        >
          {strings('pro_hub.cancel_membership.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mb-6"
          testID={CancelMembershipTestIds.SUBTITLE}
        >
          {strings('pro_hub.cancel_membership.subtitle')}
        </Text>

        {/* ── Stats card ────────────────────────────────────────────────── */}
        <Box
          twClassName="bg-background-section rounded-2xl p-4 gap-y-3 mb-6"
          testID={CancelMembershipTestIds.STATS_CARD}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('pro_hub.cancel_membership.earned_as_member')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.SuccessDefault}
            >
              {MOCK_CANCEL_STATS.earnedAsMember}
            </Text>
          </Box>

          <Box twClassName="border-b border-border-muted" />

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('pro_hub.cancel_membership.membership_cost')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {MOCK_CANCEL_STATS.membershipCost}
            </Text>
          </Box>
        </Box>

        {/* ── Reason options ─────────────────────────────────────────────── */}
        <Box
          twClassName="gap-y-3"
          testID={CancelMembershipTestIds.REASONS_LIST}
        >
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

        {showStayQuestion && (
          <Box
            twClassName="mt-6 gap-y-3"
            onLayout={handleStayQuestionLayout}
            testID={CancelMembershipTestIds.STAY_QUESTION}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {strings('pro_hub.cancel_membership.stay_question')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('pro_hub.cancel_membership.stay_question_optional')}
            </Text>
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
          </Box>
        )}
      </ScrollView>

      {/* ── Bottom actions ─────────────────────────────────────────────────── */}
      <Box twClassName="px-4 pb-2 gap-y-4 w-full">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onKeepMembership}
          testID={CancelMembershipTestIds.KEEP_BUTTON}
          isFullWidth
        >
          {strings('pro_hub.cancel_membership.keep_membership')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={onCancelConfirm}
          testID={CancelMembershipTestIds.CANCEL_BUTTON}
          isFullWidth
        >
          {strings('pro_hub.cancel_membership.cancel')}
        </Button>
      </Box>
    </>
  );
};

export default CancelSurveyStep;
