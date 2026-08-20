import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
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
  MOCK_CANCEL_STATS,
} from '../CancelMembership.constants';

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
}

const CancelSurveyStep = ({
  selectedReasonId,
  onReasonSelect,
  onBack,
  onKeepMembership,
  onCancelConfirm,
}: CancelSurveyStepProps) => {
  const tw = useTailwind();

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
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pt-2 pb-6')}
        showsVerticalScrollIndicator={false}
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
          {CANCEL_REASONS.map((reason) => (
            <ReasonItem
              key={reason.id}
              id={reason.id}
              label={strings(reason.labelKey)}
              isSelected={selectedReasonId === reason.id}
              onPress={() => onReasonSelect(reason.id)}
            />
          ))}
        </Box>
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
