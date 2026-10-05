import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
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
import { ToastContext } from '../../../component-library/components/Toast';
import {
  ButtonIconVariant,
  ToastVariants,
} from '../../../component-library/components/Toast/Toast.types';
import { IconName as ToastIconName } from '../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { ProHubTestIds } from './ProHub.testIds';
import {
  ADD_FUNDS_BANNER_KINDS,
  ADD_FUNDS_DEMO_DELAY_MS,
  ALSO_INCLUDED_ITEMS,
  AddFundsDemoOutcome,
  MEMBERSHIP_BANNER_STATES,
  MOCK_MEMBERSHIP_BANNER_KIND,
  MOCK_PRO_HUB_STATS,
  type MembershipBannerKind,
} from './ProHub.constants';
import AlsoIncludedRow from './components/AlsoIncludedRow';
import MembershipBanner from './components/MembershipBanner';
import PaymentFailureSheet from './components/PaymentFailureSheet/PaymentFailureSheet';
import ProDemoBannerSwitcher from './components/ProDemoBannerSwitcher';
import { PRO_DEMO_MODE } from '../shared/pro/proDemo';
import PhysicalCardBanner from './components/PhysicalCardBanner';
import MemberPricingOnTrades from './components/MemberPricingOnTrades';

const formatPercent = (value: number): string => `${value}%`;

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
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);
  const addFundsToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [addFundsOutcome, setAddFundsOutcome] = useState<AddFundsDemoOutcome>(
    AddFundsDemoOutcome.Success,
  );
  const [isPaymentFailureSheetVisible, setIsPaymentFailureSheetVisible] =
    useState(false);
  const addFundsOutcomeRef = useRef(addFundsOutcome);
  addFundsOutcomeRef.current = addFundsOutcome;
  const [membershipBannerKind, setMembershipBannerKind] =
    useState<MembershipBannerKind>(MOCK_MEMBERSHIP_BANNER_KIND);
  const membershipBannerState = MEMBERSHIP_BANNER_STATES[membershipBannerKind];

  const clearAddFundsToastTimeout = useCallback(() => {
    if (addFundsToastTimeoutRef.current) {
      clearTimeout(addFundsToastTimeoutRef.current);
      addFundsToastTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearAddFundsToastTimeout, [clearAddFundsToastTimeout]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleManageMembership = useCallback(() => {
    navigation.navigate(Routes.PRO_HUB.MEMBERSHIP);
  }, [navigation]);

  const handleGetCard = useCallback(() => {
    navigation.navigate(Routes.CARD.ROOT);
  }, [navigation]);

  const startAddFundsDemoRef = useRef<() => void>(() => undefined);

  const showAddFundsResult = useCallback(
    (outcome: AddFundsDemoOutcome) => {
      const closeToast = () => {
        toastRef?.current?.closeToast();
      };

      if (outcome === AddFundsDemoOutcome.Failed) {
        closeToast();
        setIsPaymentFailureSheetVisible(true);
        return;
      }

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: ToastIconName.Confirmation,
        iconColor: colors.success.default,
        backgroundColor: 'transparent',
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('pro_hub.add_funds_toast.added_title'),
            isBold: true,
          },
        ],
        closeButtonOptions: {
          variant: ButtonIconVariant.Icon,
          iconName: ToastIconName.Close,
          onPress: closeToast,
        },
      });
    },
    [colors.success.default, toastRef],
  );

  const startAddFundsDemo = useCallback(() => {
    if (!ADD_FUNDS_BANNER_KINDS.has(membershipBannerKind)) {
      return;
    }

    const outcome = addFundsOutcomeRef.current;
    clearAddFundsToastTimeout();
    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      hasNoTimeout: true,
      startAccessory: (
        <ActivityIndicator size="small" color={colors.icon.default} />
      ),
      labelOptions: [
        {
          label: strings('pro_hub.add_funds_toast.adding_title'),
          isBold: true,
        },
      ],
      descriptionOptions: {
        description: strings('pro_hub.add_funds_toast.adding_description'),
      },
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: ToastIconName.Close,
        onPress: () => {
          clearAddFundsToastTimeout();
          toastRef?.current?.closeToast();
        },
      },
    });

    addFundsToastTimeoutRef.current = setTimeout(() => {
      addFundsToastTimeoutRef.current = null;
      showAddFundsResult(outcome);
    }, ADD_FUNDS_DEMO_DELAY_MS);
  }, [
    clearAddFundsToastTimeout,
    colors.icon.default,
    membershipBannerKind,
    showAddFundsResult,
    toastRef,
  ]);

  startAddFundsDemoRef.current = startAddFundsDemo;

  const handleMembershipAlertAction = startAddFundsDemo;

  const dismissPaymentFailureSheet = useCallback(() => {
    setIsPaymentFailureSheetVisible(false);
  }, []);

  const retryAddFundsFromFailureSheet = useCallback(() => {
    setIsPaymentFailureSheetVisible(false);
    startAddFundsDemoRef.current();
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
          {PRO_DEMO_MODE ? (
            <ProDemoBannerSwitcher
              selectedKind={membershipBannerKind}
              onSelect={setMembershipBannerKind}
              addFundsOutcome={addFundsOutcome}
              onAddFundsOutcomeSelect={setAddFundsOutcome}
            />
          ) : null}
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
      <PaymentFailureSheet
        isVisible={isPaymentFailureSheetVisible}
        onTryAgain={retryAddFundsFromFailureSheet}
        onDismiss={dismissPaymentFailureSheet}
      />
    </SafeAreaView>
  );
};

export default ProHub;
