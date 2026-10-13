import React, { useCallback, useEffect, useMemo } from 'react';
import {
  AccessibilityInfo,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
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
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  selectMoneyAccountPlusPricing,
  selectMoneyAccountPlusSubscription,
} from '../../../../../selectors/subscriptionController';
import { useResumeMembership } from '../../hooks/useResumeMembership';
import {
  getMembershipManageAction,
  MembershipManageAction,
} from '../../ProHub.utils';
import { MembershipTestIds } from './Membership.testIds';
import { getMembershipDetails } from './Membership.utils';

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionDivider = () => (
  <Box twClassName="border-b border-border-muted my-5" />
);

interface InfoRowProps {
  label: string;
  value: string;
  testID?: string;
}

const InfoRow = ({ label, value, testID }: InfoRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    testID={testID}
    twClassName="py-4"
  >
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      fontWeight={FontWeight.Medium}
    >
      {label}
    </Text>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {value}
    </Text>
  </Box>
);

interface ManageRowProps {
  label: string;
  onPress: () => void;
  testID?: string;
  isDisabled?: boolean;
  isBusy?: boolean;
}

const ManageRow = ({
  label,
  onPress,
  testID,
  isDisabled,
  isBusy,
}: ManageRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityState={{
      disabled: Boolean(isDisabled),
      busy: Boolean(isBusy),
    }}
    disabled={isDisabled}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="py-4"
    >
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        fontWeight={FontWeight.Medium}
      >
        {label}
      </Text>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </Box>
  </TouchableOpacity>
);

interface MembershipActionRowProps {
  action: MembershipManageAction;
  isResuming: boolean;
  onResume: () => void;
  onCancel: () => void;
}

const MembershipActionRow = ({
  action,
  isResuming,
  onResume,
  onCancel,
}: MembershipActionRowProps) => {
  if (action === MembershipManageAction.Resume) {
    return (
      <ManageRow
        label={strings('pro_hub.membership.resume_membership')}
        onPress={onResume}
        testID={MembershipTestIds.RESUME_MEMBERSHIP_ROW}
        isDisabled={isResuming}
        isBusy={isResuming}
      />
    );
  }

  if (action === MembershipManageAction.Cancel) {
    return (
      <ManageRow
        label={strings('pro_hub.membership.cancel_membership')}
        onPress={onCancel}
        testID={MembershipTestIds.CANCEL_MEMBERSHIP_ROW}
      />
    );
  }

  return null;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const Membership = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { top } = useSafeAreaInsets();
  const subscription = useSelector(selectMoneyAccountPlusSubscription);
  const plusPricing = useSelector(selectMoneyAccountPlusPricing);
  const membershipDetails = useMemo(
    () => getMembershipDetails(subscription, plusPricing),
    [plusPricing, subscription],
  );
  const {
    resumeMembership,
    isResuming,
    errorMessage: resumeErrorMessage,
  } = useResumeMembership();
  const manageAction = getMembershipManageAction(subscription);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleInvoices = useCallback(() => {
    // TODO: navigate to invoices
  }, []);

  const handleContactSupport = useCallback(() => {
    // TODO: navigate to support
  }, []);

  const handleCancelMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.CANCEL_MEMBERSHIP);
  }, [navigation]);

  // Live regions miss users whose focus stays on the row. Announce the
  // in-flight and failure states so VoiceOver and TalkBack hear them
  // (WCAG 4.1.3 status messages, 3.3.1 error identification).
  useEffect(() => {
    if (!isResuming) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      strings('pro_hub.membership.resume_in_progress'),
    );
  }, [isResuming]);

  useEffect(() => {
    if (!resumeErrorMessage) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(resumeErrorMessage);
  }, [resumeErrorMessage]);

  return (
    <View
      style={[tw.style('flex-1 bg-background-default'), { paddingTop: top }]}
      testID={MembershipTestIds.CONTAINER}
    >
      <HeaderBase
        twClassName="px-4"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={MembershipTestIds.BACK_BUTTON}
          />
        }
      />

      <ScrollView
        contentContainerStyle={tw.style('px-4 pt-2 pb-10')}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          testID={MembershipTestIds.TITLE}
          twClassName="mb-2"
        >
          {strings('pro_hub.membership.title')}
        </Text>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <Box testID={MembershipTestIds.STATS_SECTION}>
          <InfoRow
            label={strings('pro_hub.membership.plan')}
            value={membershipDetails.plan}
            testID={MembershipTestIds.PLAN_ROW}
          />
          <InfoRow
            label={strings('pro_hub.membership.lifetime_earnings')}
            value={membershipDetails.lifetimeEarnings}
            testID={MembershipTestIds.LIFETIME_EARNINGS_ROW}
          />
        </Box>

        <SectionDivider />

        {/* ── Payment details ───────────────────────────────────────────── */}
        <Box testID={MembershipTestIds.PAYMENT_SECTION}>
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            twClassName="mb-2"
          >
            {strings('pro_hub.membership.payment_details')}
          </Text>

          <Box>
            {/* Total row — strikethrough original + discounted price */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              testID={MembershipTestIds.TOTAL_ROW}
              twClassName="py-4"
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('pro_hub.membership.total')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-x-1 flex-wrap"
              >
                {membershipDetails.totalOriginal ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    twClassName="line-through"
                  >
                    {membershipDetails.totalOriginal}
                  </Text>
                ) : null}
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {membershipDetails.total}
                </Text>
                {membershipDetails.savingsNote ? (
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {`(${membershipDetails.savingsNote})`}
                  </Text>
                ) : null}
              </Box>
            </Box>

            {/* Paying with */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              testID={MembershipTestIds.PAYING_WITH_ROW}
              twClassName="py-4"
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('pro_hub.membership.paying_with')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-x-2"
              >
                <Box twClassName="w-5 h-5 bg-accent04-light rounded-lg flex items-center justify-center">
                  <Icon
                    name={IconName.AttachMoney}
                    size={IconSize.Sm}
                    twClassName="text-accent04-dark font-bold"
                  />
                </Box>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {membershipDetails.payingWith}
                </Text>
              </Box>
            </Box>

            {/* Renews on */}
            <InfoRow
              label={strings('pro_hub.membership.renews_on')}
              value={membershipDetails.renewsOn}
              testID={MembershipTestIds.RENEWS_ON_ROW}
            />
          </Box>
        </Box>

        <SectionDivider />

        {/* ── Manage ───────────────────────────────────────────────────────── */}
        <Box
          testID={MembershipTestIds.MANAGE_SECTION}
          twClassName="flex flex-col"
        >
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            twClassName="mb-2"
          >
            {strings('pro_hub.membership.manage')}
          </Text>
          <ManageRow
            label={strings('pro_hub.membership.invoices')}
            onPress={handleInvoices}
            testID={MembershipTestIds.INVOICES_ROW}
          />
          <ManageRow
            label={strings('pro_hub.membership.contact_support')}
            onPress={handleContactSupport}
            testID={MembershipTestIds.CONTACT_SUPPORT_ROW}
          />
          <MembershipActionRow
            action={manageAction}
            isResuming={isResuming}
            onResume={resumeMembership}
            onCancel={handleCancelMembership}
          />
          {resumeErrorMessage ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              testID={MembershipTestIds.RESUME_ERROR}
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
            >
              {resumeErrorMessage}
            </Text>
          ) : null}
        </Box>
      </ScrollView>
    </View>
  );
};

export default Membership;
