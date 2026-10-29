import React, { useCallback, useEffect, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
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
  FontFamily,
  FontWeight,
  HeaderBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { ProHubTestIds } from './ProHub.testIds';
import { ALSO_INCLUDED_ITEMS, MOCK_PRO_HUB_STATS } from './ProHub.constants';
import AlsoIncludedRow from './components/AlsoIncludedRow';
import MembershipBanner from './components/MembershipBanner';
import { MembershipAlertAction } from './components/MembershipBanner/MembershipBanner.utils';
import { useMembershipBannerModel } from './hooks/useMembershipBannerModel';
import { useHasProMembership } from '../../../hooks/useHasProMembership';
import {
  MoneyAccountPlusAccess,
  useMoneyAccountPlusAccess,
} from '../../../hooks/useMoneyAccountPlusAccess';
import { selectIsMoneyAccountPlusTrialing } from '../../../selectors/subscriptionController';
import { useMoneyAccountSinceInceptionInterest } from '../../UI/Money/hooks/useMoneyAccountInterest';
import useMoneyPremiumAccountInterest from '../../UI/Money/hooks/useMoneyPremiumAccountInterest';
import useMoneyPremiumVaultRate from '../../UI/Money/hooks/useMoneyPremiumVaultRate';
import { formatCombinedSinceInceptionInterest } from '../../UI/Money/utils/formatCombinedSinceInceptionInterest';
import PhysicalCardBanner from './components/PhysicalCardBanner';
import MemberPricingOnTrades from './components/MemberPricingOnTrades';

const formatPercent = (value: number): string => `${value}%`;

interface StatRowProps {
  iconName: IconName;
  label: string;
  value?: string;
  isLocked?: boolean;
  testID: string;
}

const StatRow = ({
  iconName,
  label,
  value,
  isLocked = false,
  testID,
}: StatRowProps) => (
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
    {isLocked ? (
      <Icon
        name={IconName.Lock}
        size={IconSize.Md}
        color={IconColor.IconDefault}
        accessibilityLabel={strings('pro_hub.musd_back_locked')}
        testID={`${testID}-lock`}
      />
    ) : (
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {value}
      </Text>
    )}
  </Box>
);

const ProHub = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const { model: membershipBanner } = useMembershipBannerModel();
  const proAccess = useMoneyAccountPlusAccess();
  const hasMembership = useHasProMembership();
  const isTrialing = useSelector(selectIsMoneyAccountPlusTrialing);
  const { sinceInceptionQuery: premiumSinceInceptionQuery } =
    useMoneyPremiumAccountInterest();
  const baseSinceInceptionQuery = useMoneyAccountSinceInceptionInterest();
  const { ratePercentFormatted } = useMoneyPremiumVaultRate();
  const totalInterest = useMemo(
    () =>
      formatCombinedSinceInceptionInterest({
        premium: {
          usd: premiumSinceInceptionQuery.data?.interest_earned_usd,
          failed: premiumSinceInceptionQuery.isError,
        },
        base: {
          usd: baseSinceInceptionQuery.data?.interest_earned_usd,
          failed: baseSinceInceptionQuery.isError,
        },
      }),
    [
      baseSinceInceptionQuery.data?.interest_earned_usd,
      baseSinceInceptionQuery.isError,
      premiumSinceInceptionQuery.data?.interest_earned_usd,
      premiumSinceInceptionQuery.isError,
    ],
  );
  const moneyBalanceApy = ratePercentFormatted ?? '—';
  const showHubContent =
    hasMembership &&
    proAccess !== MoneyAccountPlusAccess.Disabled &&
    proAccess !== MoneyAccountPlusAccess.Unknown;

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Any Plus status except canceled stays. Unknown access waits for the first
  // fetch. A canceled plan, or no plan, leaves.
  useEffect(() => {
    if (
      proAccess === MoneyAccountPlusAccess.Unknown ||
      (hasMembership && proAccess !== MoneyAccountPlusAccess.Disabled)
    ) {
      return;
    }
    navigation.goBack();
  }, [hasMembership, navigation, proAccess]);

  const handleManageMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP);
  }, [navigation]);

  const handleGetCard = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const handleMembershipAlertAction = useCallback(
    (action: MembershipAlertAction) => {
      switch (action) {
        case MembershipAlertAction.AddFunds:
          navigation.navigate(Routes.MONEY.MODALS.ROOT, {
            screen: Routes.MONEY.MODALS.ADD_MONEY_SHEET,
          });
          return;
        case MembershipAlertAction.Renew:
          navigation.navigate(Routes.PRO_SUBSCRIPTION.ROOT);
          return;
        default: {
          const unexpectedAction: never = action;
          return unexpectedAction;
        }
      }
    },
    [navigation],
  );

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

      {showHubContent && (
        <ScrollView
          contentContainerStyle={tw.style('px-4 pt-2 pb-10')}
          showsVerticalScrollIndicator={false}
        >
          <Box twClassName="w-full mb-4 gap-y-4">
            <MembershipBanner
              testID={ProHubTestIds.MEMBERSHIP_BANNER}
              model={membershipBanner}
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
                  variant={TextVariant.AmountDisplayLg}
                  fontFamily={FontFamily.Hero}
                  color={TextColor.TextDefault}
                >
                  {totalInterest}
                </Text>
              </Box>

              <Box twClassName="gap-y-4">
                <StatRow
                  iconName={IconName.TrendUp}
                  label={strings('pro_hub.money_balance', {
                    apy: moneyBalanceApy,
                  })}
                  value={totalInterest}
                  testID={ProHubTestIds.MONEY_BALANCE_ROW}
                />
                <StatRow
                  iconName={IconName.Card}
                  label={strings('pro_hub.musd_back', {
                    rate: formatPercent(MOCK_PRO_HUB_STATS.musdBackRate),
                  })}
                  value={isTrialing ? undefined : MOCK_PRO_HUB_STATS.musdBack}
                  isLocked={isTrialing}
                  testID={ProHubTestIds.MUSD_BACK_ROW}
                />
              </Box>
            </Box>
          </Box>

          <PhysicalCardBanner
            onPress={isTrialing ? undefined : handleGetCard}
            isSubscriptionTrialing={isTrialing}
            cashbackRate={formatPercent(MOCK_PRO_HUB_STATS.musdBackRate)}
          />

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
      )}
    </SafeAreaView>
  );
};

export default ProHub;
