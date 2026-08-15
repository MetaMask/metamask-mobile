import React, { useCallback, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  CancelMembershipTestIds,
  getCancelReasonCheckmarkTestId,
  getCancelReasonTestId,
} from './CancelMembership.testIds';
import {
  CANCEL_REASONS,
  MOCK_CANCEL_STATS,
} from './CancelMembership.constants';

// ─── Sub-components ───────────────────────────────────────────────────────────

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

// ─── Screen ───────────────────────────────────────────────────────────────────

const CancelMembership = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { top } = useSafeAreaInsets();
  const [selectedReasonId, setSelectedReasonId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleKeepMembership = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCancelConfirm = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.CANCELLATION_SUCCESS as never);
  }, [navigation]);

  const handleReasonSelect = useCallback((id: string) => {
    setSelectedReasonId(id);
  }, []);

  return (
    <View
      style={[tw.style('flex-1 bg-background-default'), { paddingTop: top }]}
      testID={CancelMembershipTestIds.CONTAINER}
    >
      <HeaderBase
        twClassName="px-4"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={CancelMembershipTestIds.BACK_BUTTON}
          />
        }
      />

      <ScrollView
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
              onPress={() => handleReasonSelect(reason.id)}
            />
          ))}
        </Box>
      </ScrollView>

      {/* ── Bottom actions ─────────────────────────────────────────────────── */}
      <Box twClassName="px-4 pb-6 gap-y-4 w-full">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleKeepMembership}
          testID={CancelMembershipTestIds.KEEP_BUTTON}
          isFullWidth
        >
          {strings('pro_hub.cancel_membership.keep_membership')}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={handleCancelConfirm}
          testID={CancelMembershipTestIds.CANCEL_BUTTON}
          isFullWidth
        >
          {strings('pro_hub.cancel_membership.cancel')}
        </Button>
      </Box>
    </View>
  );
};

export default CancelMembership;
