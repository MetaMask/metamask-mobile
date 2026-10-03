import React, { useCallback, useMemo } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { PRODUCT_TYPES } from '@metamask/subscription-controller';
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
import type { RootState } from '../../../../../reducers';
import {
  selectMoneyAccountPlusPricing,
  selectSubscriptionByProduct,
} from '../../../../../selectors/subscriptionController';
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
}

const ManageRow = ({ label, onPress, testID }: ManageRowProps) => (
  <TouchableOpacity
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
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

// ─── Screen ───────────────────────────────────────────────────────────────────

const selectMoneyAccountPlusSubscription = (state: RootState) =>
  selectSubscriptionByProduct(state, PRODUCT_TYPES.MONEY_ACCOUNT_PLUS);

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
          <ManageRow
            label={strings('pro_hub.membership.cancel_membership')}
            onPress={handleCancelMembership}
            testID={MembershipTestIds.CANCEL_MEMBERSHIP_ROW}
          />
        </Box>
      </ScrollView>
    </View>
  );
};

export default Membership;
