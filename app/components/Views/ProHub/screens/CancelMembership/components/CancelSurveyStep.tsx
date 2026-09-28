import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  OTHER_REASON_ID,
} from '../CancelMembership.constants';
import { shuffleCancelReasons } from '../CancelMembership.utils';

/**
 * Leaves the selected reason partially visible above the revealed field so the
 * auto-scroll reads as continuous rather than a jump.
 */
const REVEALED_FIELD_SCROLL_INSET = 16;

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
  otherReasonText: string;
  onReasonSelect: (id: string) => void;
  onStayFeedbackChange: (value: string) => void;
  onOtherReasonChange: (value: string) => void;
  onBack: () => void;
  onKeepMembership: () => void;
  onCancelConfirm: () => void;
  isSubmitting: boolean;
  errorMessage: string | null;
}

const CancelSurveyStep = ({
  selectedReasonId,
  stayFeedback,
  otherReasonText,
  onReasonSelect,
  onStayFeedbackChange,
  onOtherReasonChange,
  onBack,
  onKeepMembership,
  onCancelConfirm,
  isSubmitting,
  errorMessage,
}: CancelSurveyStepProps) => {
  const tw = useTailwind();
  const scrollViewRef = useRef<ScrollView>(null);
  const lastScrolledReasonIdRef = useRef<string | null>(null);
  const stayQuestionYRef = useRef<number | null>(null);
  const showStayQuestion = selectedReasonId !== null;
  const showOtherReasonInput = selectedReasonId === OTHER_REASON_ID;
  const orderedReasons = useMemo(
    () => shuffleCancelReasons(CANCEL_REASONS),
    [],
  );

  // Selecting a reason reveals fields below the stats card and six reason
  // rows, so on shorter devices they appear off-screen. Scroll once per
  // selected reason: onLayout also fires as the multiline inputs grow, and
  // re-scrolling mid-typing would yank the field out from under the user.
  // Changing the reason (including among non-Other options) scrolls again,
  // because the user typically scrolled back up to pick a different reason.
  const scrollToRevealedFieldY = useCallback((y: number) => {
    scrollViewRef.current?.scrollTo({
      y: Math.max(0, y - REVEALED_FIELD_SCROLL_INSET),
      animated: true,
    });
  }, []);

  const scrollRevealedFieldForReason = useCallback(
    (y: number) => {
      if (
        selectedReasonId === null ||
        lastScrolledReasonIdRef.current === selectedReasonId
      ) {
        return;
      }
      lastScrolledReasonIdRef.current = selectedReasonId;
      scrollToRevealedFieldY(y);
    },
    [selectedReasonId, scrollToRevealedFieldY],
  );

  const handleOtherReasonLayout = useCallback(
    (event: LayoutChangeEvent) => {
      scrollRevealedFieldForReason(event.nativeEvent.layout.y);
    },
    [scrollRevealedFieldForReason],
  );

  const handleStayQuestionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const y = event.nativeEvent.layout.y;
      stayQuestionYRef.current = y;
      scrollRevealedFieldForReason(y);
    },
    [scrollRevealedFieldForReason],
  );

  useEffect(() => {
    if (selectedReasonId === null || showOtherReasonInput) {
      return;
    }
    if (lastScrolledReasonIdRef.current === selectedReasonId) {
      return;
    }
    const stayQuestionY = stayQuestionYRef.current;
    if (stayQuestionY === null) {
      return;
    }
    lastScrolledReasonIdRef.current = selectedReasonId;
    scrollToRevealedFieldY(stayQuestionY);
  }, [selectedReasonId, showOtherReasonInput, scrollToRevealedFieldY]);

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
            isDisabled={isSubmitting}
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
            style={tw.style(
              'mt-3 min-h-[96px] rounded-xl border border-muted bg-muted px-3 py-3 text-body-md text-default',
            )}
            onLayout={handleOtherReasonLayout}
            testID={CancelMembershipTestIds.OTHER_REASON_INPUT}
          />
        )}

        {showStayQuestion && (
          <Box
            twClassName="mt-6 gap-y-3"
            // When "Other" is selected its input sits above and owns the
            // scroll, so anchoring here would push that input off-screen.
            onLayout={
              showOtherReasonInput ? undefined : handleStayQuestionLayout
            }
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
          isDisabled={isSubmitting}
        >
          {strings('pro_hub.cancel_membership.keep_membership')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={onCancelConfirm}
          testID={CancelMembershipTestIds.CANCEL_BUTTON}
          isFullWidth
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
        >
          {strings('pro_hub.cancel_membership.cancel')}
        </Button>
        {errorMessage && (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            twClassName="text-center"
            testID={CancelMembershipTestIds.ERROR_MESSAGE}
          >
            {errorMessage}
          </Text>
        )}
      </Box>
    </>
  );
};

export default CancelSurveyStep;
