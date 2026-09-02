import React, { useCallback } from 'react';
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
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { ProHubTestIds } from './ProHub.testIds';
import { MOCK_NEXT_PAYMENT, MOCK_PRO_HUB_STATS } from './ProHub.constants';
import PhysicalCardBanner from './components/PhysicalCardBanner';
import { BENEFITS, BenefitRow } from '../shared/pro';
import MemberPricingOnTrades from './components/MemberPricingOnTrades';

interface MembershipBannerProps {
  testID: string;
}

const MembershipBanner = ({ testID }: MembershipBannerProps) => (
  <Card
    twClassName="w-full bg-background-section rounded-xl p-5 border border-border-alternative"
    testID={testID}
  >
    <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
      {strings('pro_hub.membership_brand')}
    </Text>
    <Text variant={TextVariant.DisplayMd} color={TextColor.TextDefault}>
      {strings('pro_hub.membership_label')}
    </Text>
  </Card>
);

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
    twClassName="py-4"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-x-3"
    >
      <Box twClassName="w-10 h-10 rounded-full bg-background-section items-center justify-center">
        <Icon
          name={iconName}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
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

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleManageMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP);
  }, [navigation]);

  const handleGetCard = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

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
          <MembershipBanner testID={ProHubTestIds.MEMBERSHIP_BANNER} />

          <Box
            twClassName="gap-y-1"
            testID={ProHubTestIds.LIFETIME_EARNINGS_SECTION}
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('pro_hub.lifetime_earnings')}
            </Text>
            <Text
              variant={TextVariant.AmountDisplayLg}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {MOCK_PRO_HUB_STATS.lifetimeEarnings}
            </Text>

            <Box>
              <StatRow
                iconName={IconName.TrendUp}
                label={strings('pro_hub.money_balance')}
                value={MOCK_PRO_HUB_STATS.moneyBalance}
                testID={ProHubTestIds.MONEY_BALANCE_ROW}
              />
              <StatRow
                iconName={IconName.Card}
                label={strings('pro_hub.musd_back')}
                value={MOCK_PRO_HUB_STATS.musdBack}
                testID={ProHubTestIds.MUSD_BACK_ROW}
              />
            </Box>
          </Box>
        </Box>

        <PhysicalCardBanner onPress={handleGetCard} />

        <SectionDivider marginVertical={6} />

        <MemberPricingOnTrades />

        <SectionDivider marginVertical={6} />

        <Box testID={ProHubTestIds.MEMBERSHIP_SECTION} twClassName="gap-y-4">
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {strings('pro_hub.membership.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            testID={ProHubTestIds.NEXT_PAYMENT_TEXT}
          >
            {strings('pro_hub.next_payment', {
              amount: MOCK_NEXT_PAYMENT.amount,
              date: MOCK_NEXT_PAYMENT.date,
            })}
          </Text>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            onPress={handleManageMembership}
            isFullWidth
            testID={ProHubTestIds.MANAGE_BUTTON}
          >
            {strings('pro_hub.manage_plan')}
          </Button>
        </Box>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProHub;
