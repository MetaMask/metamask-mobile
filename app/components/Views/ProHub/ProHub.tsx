import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonSize,
  ButtonVariant,
  Card,
  HeaderBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
  FontWeight,
  BannerAlert,
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { ProHubTestIds } from './ProHub.testIds';
import {
  ALSO_INCLUDED_ITEMS,
  MEMBERSHIP_BANNER_STATES,
  MOCK_MEMBERSHIP_BANNER_KIND,
  MOCK_PRO_HUB_STATS,
  type MembershipBannerState,
} from './ProHub.constants';
import AlsoIncludedRow from './components/AlsoIncludedRow';
import PhysicalCardBanner from './components/PhysicalCardBanner';
import MemberPricingOnTrades from './components/MemberPricingOnTrades';

interface MembershipBannerProps {
  testID: string;
  state: MembershipBannerState;
  addFundsDueDate: string;
  onAction: () => void;
}

const formatPercent = (value: number): string => `${value}%`;

export const MembershipBanner = ({
  testID,
  state,
  addFundsDueDate,
  onAction,
}: MembershipBannerProps) => {
  const alertTitle = state.interpolatesDate
    ? strings(state.titleKey, { date: addFundsDueDate })
    : strings(state.titleKey);

  return (
    <Card
      twClassName="w-full bg-background-section rounded-xl p-4 border-0"
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('pro_hub.title')}
        </Text>
        <Icon
          name={IconName.Info}
          size={IconSize.Lg}
          color={state.iconColor}
          testID={ProHubTestIds.MEMBERSHIP_STATUS_ICON}
        />
      </Box>
      <Text
        variant={TextVariant.HeadingLg}
        color={TextColor.TextDefault}
        testID={ProHubTestIds.MEMBERSHIP_STATUS_LABEL}
      >
        {strings(state.statusKey)}
      </Text>
      <BannerAlert
        severity={state.bannerSeverity}
        startAccessory={null}
        title={alertTitle}
        description={strings(state.descriptionKey)}
        actionButtonLabel={strings(state.actionKey)}
        actionButtonOnPress={onAction}
        actionButtonProps={{ testID: ProHubTestIds.MEMBERSHIP_ALERT_ACTION }}
        twClassName="mt-3"
        testID={ProHubTestIds.MEMBERSHIP_ALERT_BANNER}
      />
    </Card>
  );
};

interface StatRowProps {
  iconName: IconName;
  label: string;
  value: string;
  testID: string;
}

const StatRow = ({ iconName, label, value, testID }: StatRowProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    testID={testID}
    twClassName="py-1"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-x-2"
    >
      <Box twClassName="w-8 h-8 rounded-full bg-background-section items-center justify-center">
        <Icon
          name={iconName}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {value}
    </Text>
  </Box>
);

const ProHub = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [membershipBannerState] = useState<MembershipBannerState>(
    MEMBERSHIP_BANNER_STATES[MOCK_MEMBERSHIP_BANNER_KIND],
  );

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleManageMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP);
  }, [navigation]);

  const handleGetCard = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const handleMembershipAlertAction = useCallback(() => {
    /* TODO: Implement membership alert action */
  }, []);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-background-default')}
      edges={['top', 'bottom']}
      testID={ProHubTestIds.CONTAINER}
    >
      <HeaderBase
        testID={ProHubTestIds.HEADER_ROOT}
        twClassName="px-4"
        startAccessory={
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            accessibilityLabel={strings('navigation.back')}
            testID={ProHubTestIds.BACK_BUTTON}
          />
        }
        endAccessory={
          <ButtonIcon
            iconName={IconName.Setting}
            onPress={handleManageMembership}
            accessibilityLabel={strings('pro_hub.manage')}
            testID={ProHubTestIds.MANAGE_PLANS_BUTTON}
          />
        }
      >
        {strings('pro_hub.title')}
      </HeaderBase>

      <ScrollView
        contentContainerStyle={tw.style('px-4 pt-2 pb-10')}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="w-full mb-4 gap-y-4">
          <MembershipBanner
            testID={ProHubTestIds.MEMBERSHIP_BANNER}
            state={membershipBannerState}
            addFundsDueDate={MOCK_PRO_HUB_STATS.addFundsDueDate}
            onAction={handleMembershipAlertAction}
          />

          <Box
            twClassName="gap-y-4"
            testID={ProHubTestIds.LIFETIME_EARNINGS_SECTION}
          >
            <Box twClassName="gap-y-1">
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('pro_hub.lifetime_earnings')}
              </Text>
              <Text
                variant={TextVariant.DisplayLg}
                color={TextColor.TextDefault}
              >
                {MOCK_PRO_HUB_STATS.lifetimeEarnings}
              </Text>
            </Box>

            <Box twClassName="gap-y-4">
              <StatRow
                iconName={IconName.TrendUp}
                label={strings('pro_hub.money_balance', {
                  apy: formatPercent(MOCK_PRO_HUB_STATS.moneyBalanceApy),
                })}
                value={MOCK_PRO_HUB_STATS.moneyBalance}
                testID={ProHubTestIds.MONEY_BALANCE_ROW}
              />
              <StatRow
                iconName={IconName.Card}
                label={strings('pro_hub.musd_back', {
                  rate: formatPercent(MOCK_PRO_HUB_STATS.musdBackRate),
                })}
                value={MOCK_PRO_HUB_STATS.musdBack}
                testID={ProHubTestIds.MUSD_BACK_ROW}
              />
            </Box>
          </Box>
        </Box>

        <PhysicalCardBanner onPress={handleGetCard} />

        <SectionDivider marginVertical={5} />

        <MemberPricingOnTrades />

        <SectionDivider marginVertical={5} />

        <Box testID={ProHubTestIds.ALSO_INCLUDED_SECTION}>
          <Box twClassName="gap-y-6">
            <Text
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {strings('pro_hub.also_included.title')}
            </Text>
            <Box twClassName="gap-y-3">
              {ALSO_INCLUDED_ITEMS.map((item) => (
                <AlsoIncludedRow
                  key={item.id}
                  item={item}
                  testID={ProHubTestIds.ALSO_INCLUDED_ROW(item.id)}
                />
              ))}
            </Box>
          </Box>
          <SectionDivider twClassName="mb-8" />
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleManageMembership}
            isFullWidth
            testID={ProHubTestIds.MANAGE_BUTTON}
            twClassName="mb-8"
          >
            {strings('pro_hub.manage_membership')}
          </Button>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextMuted}
            testID={ProHubTestIds.DISCLAIMER_TEXT}
          >
            {strings('pro_hub.also_included.disclaimer')}
          </Text>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProHub;
