import React, { useCallback, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheet,
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
import { MembershipTestIds } from './Membership.testIds';
import {
  MOCK_MEMBERSHIP_STATS,
  MOCK_PAYMENT_DETAILS,
} from './Membership.constants';

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionDivider = () => (
  <Box twClassName="border-b border-border-muted my-6" />
);

interface InfoRowProps {
  label: string;
  value: string;
  hasInfo?: boolean;
  onPress?: () => void;
  testID?: string;
}

const InfoRow = ({
  label,
  value,
  hasInfo = false,
  onPress,
  testID,
}: InfoRowProps) => {
  const inner = (
    <>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-x-1"
      >
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName={
            hasInfo ? 'border-b-2 border-dotted border-border-default' : ''
          }
        >
          {label}
        </Text>
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={TextColor.TextDefault}
      >
        {value}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        testID={testID}
        accessibilityRole="button"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          {inner}
        </Box>
      </TouchableOpacity>
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      testID={testID}
    >
      {inner}
    </Box>
  );
};

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
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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

// ─── Stat info bottom sheet ───────────────────────────────────────────────────

interface StatInfoSheetProps {
  title: string;
  description: string;
  onClose: () => void;
}

const StatInfoSheet = ({ title, description, onClose }: StatInfoSheetProps) => (
  <BottomSheet onClose={onClose} testID={MembershipTestIds.STAT_INFO_SHEET}>
    <Box twClassName="p-4 gap-y-4">
      <Text
        variant={TextVariant.HeadingMd}
        color={TextColor.TextDefault}
        testID={MembershipTestIds.STAT_INFO_SHEET_TITLE}
        twClassName="text-center"
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        testID={MembershipTestIds.STAT_INFO_SHEET_DESCRIPTION}
      >
        {description}
      </Text>
    </Box>
  </BottomSheet>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

type ActiveStatSheet = 'earned' | 'saved' | null;

const STAT_SHEET_CONTENT: Record<
  Exclude<ActiveStatSheet, null>,
  { titleKey: string; descriptionKey: string }
> = {
  earned: {
    titleKey: 'pro_hub.membership.earned_info.title',
    descriptionKey: 'pro_hub.membership.earned_info.description',
  },
  saved: {
    titleKey: 'pro_hub.membership.saved_info.title',
    descriptionKey: 'pro_hub.membership.saved_info.description',
  },
};

const Membership = () => {
  const navigation = useNavigation();
  const tw = useTailwind();
  const { top } = useSafeAreaInsets();
  const [activeSheet, setActiveSheet] = useState<ActiveStatSheet>(null);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCloseSheet = useCallback(() => {
    setActiveSheet(null);
  }, []);

  const handleEarnedPress = useCallback(() => {
    setActiveSheet('earned');
  }, []);

  const handleSavedPress = useCallback(() => {
    setActiveSheet('saved');
  }, []);

  const handleContactSupport = useCallback(() => {
    // TODO: navigate to support
  }, []);

  const handleCancelMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.CANCEL_MEMBERSHIP as never);
  }, [navigation]);

  return (
    <View
      style={[tw.style('flex-1 bg-background-default'), { paddingTop: top }]}
      testID={MembershipTestIds.CONTAINER}
    >
      <HeaderBase
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
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          twClassName="mb-6"
          testID={MembershipTestIds.TITLE}
        >
          {strings('pro_hub.membership.title')}
        </Text>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <Box twClassName="gap-y-4" testID={MembershipTestIds.STATS_SECTION}>
          <InfoRow
            label={strings('pro_hub.membership.plan')}
            value={MOCK_MEMBERSHIP_STATS.plan}
            testID={MembershipTestIds.PLAN_ROW}
          />
          <InfoRow
            label={strings('pro_hub.membership.earned_this_month')}
            value={MOCK_MEMBERSHIP_STATS.earnedThisMonth}
            hasInfo
            onPress={handleEarnedPress}
            testID={MembershipTestIds.EARNED_ROW}
          />
          <InfoRow
            label={strings('pro_hub.membership.saved_this_month')}
            value={MOCK_MEMBERSHIP_STATS.savedThisMonth}
            hasInfo
            onPress={handleSavedPress}
            testID={MembershipTestIds.SAVED_ROW}
          />
        </Box>

        <SectionDivider />

        {/* ── Payment details ───────────────────────────────────────────── */}
        <Box testID={MembershipTestIds.PAYMENT_SECTION}>
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
            twClassName="mb-4"
          >
            {strings('pro_hub.membership.payment_details')}
          </Text>

          <Box twClassName="gap-y-4">
            {/* Total row — strikethrough original + discounted price */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              testID={MembershipTestIds.TOTAL_ROW}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('pro_hub.membership.total')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-x-1 flex-wrap"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                  twClassName="line-through"
                >
                  {MOCK_PAYMENT_DETAILS.totalOriginal}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Bold}
                  color={TextColor.TextDefault}
                >
                  {MOCK_PAYMENT_DETAILS.totalDiscounted}
                </Text>
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {`(${MOCK_PAYMENT_DETAILS.savingsNote})`}
                </Text>
              </Box>
            </Box>

            {/* Paying with */}
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
              testID={MembershipTestIds.PAYING_WITH_ROW}
            >
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('pro_hub.membership.paying_with')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="gap-x-2"
              >
                <Box twClassName="w-8 h-8 bg-background-section rounded-lg flex items-center justify-center">
                  <Icon
                    name={IconName.Wallet}
                    size={IconSize.Sm}
                    color={IconColor.IconDefault}
                  />
                </Box>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Bold}
                  color={TextColor.TextDefault}
                >
                  {MOCK_PAYMENT_DETAILS.payingWith}
                </Text>
              </Box>
            </Box>

            {/* Renews on */}
            <InfoRow
              label={strings('pro_hub.membership.renews_on')}
              value={MOCK_PAYMENT_DETAILS.renewsOn}
              testID={MembershipTestIds.RENEWS_ON_ROW}
            />
          </Box>
        </Box>

        <SectionDivider />

        {/* ── Manage ───────────────────────────────────────────────────────── */}
        <Box
          testID={MembershipTestIds.MANAGE_SECTION}
          twClassName="flex flex-col gap-y-4"
        >
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {strings('pro_hub.membership.manage')}
          </Text>
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

      {activeSheet && (
        <StatInfoSheet
          title={strings(STAT_SHEET_CONTENT[activeSheet].titleKey)}
          description={strings(STAT_SHEET_CONTENT[activeSheet].descriptionKey)}
          onClose={handleCloseSheet}
        />
      )}
    </View>
  );
};

export default Membership;
