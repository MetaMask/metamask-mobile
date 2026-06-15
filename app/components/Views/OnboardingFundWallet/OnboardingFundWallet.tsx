import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import MoreWaysToFundBottomSheet from './MoreWaysToFundBottomSheet';
import { getMoreWaysToFundOptionById } from './MoreWaysToFundBottomSheet/MoreWaysToFundBottomSheet.constants';
import type {
  MoreWaysToFundOptionId,
  MoreWaysToFundSheetRowId,
} from './MoreWaysToFundBottomSheet/MoreWaysToFundBottomSheet.types';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { selectSelectedAccountGroup } from '../../../selectors/multichainAccounts/accountTreeController';
import Logger from '../../../util/Logger';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import { OnboardingFundWalletTestIds } from './OnboardingFundWallet.testIds';
import type { FundWalletOptionId } from './OnboardingFundWallet.types';
import {
  ONBOARDING_FUND_WALLET_DEPOSIT_FLOW_OPTION_IDS,
  ONBOARDING_FUND_WALLET_RECEIVE_FLOW_OPTION_IDS,
} from './OnboardingFundWallet.constants';
import { navigateFromOnboardingToDepositFlow } from './navigateFromOnboardingToDepositFlow';
import { navigateFromOnboardingToReceiveFlow } from './navigateFromOnboardingToReceiveFlow';
import useRampsUnifiedV2Enabled from '../../UI/Ramp/hooks/useRampsUnifiedV2Enabled';

interface FundWalletOption {
  id: FundWalletOptionId;
  labelKey: string;
  descriptionKey: string;
  iconName: IconName;
}

interface FundWalletSection {
  titleKey: string;
  options: FundWalletOption[];
}

const FUND_WALLET_SECTIONS: FundWalletSection[] = [
  {
    titleKey: 'onboarding_fund_wallet.section_bank_and_card',
    options: [
      {
        id: 'apple_pay',
        labelKey: 'onboarding_fund_wallet.option_apple_pay',
        descriptionKey: 'onboarding_fund_wallet.option_apple_pay_description',
        iconName: IconName.AppleLogo,
      },
      {
        id: 'debit_credit',
        labelKey: 'onboarding_fund_wallet.option_debit_credit',
        descriptionKey:
          'onboarding_fund_wallet.option_debit_credit_description',
        iconName: IconName.Card,
      },
      {
        id: 'wire_transfer',
        labelKey: 'onboarding_fund_wallet.option_wire_transfer',
        descriptionKey:
          'onboarding_fund_wallet.option_wire_transfer_description',
        iconName: IconName.Bank,
      },
    ],
  },
  {
    titleKey: 'onboarding_fund_wallet.section_crypto',
    options: [
      {
        id: 'receive_external',
        labelKey: 'onboarding_fund_wallet.option_receive_external',
        descriptionKey:
          'onboarding_fund_wallet.option_receive_external_description',
        iconName: IconName.SwapHorizontal,
      },
    ],
  },
  {
    titleKey: 'onboarding_fund_wallet.section_more_ways',
    options: [
      {
        id: 'paypal',
        labelKey: 'onboarding_fund_wallet.option_paypal',
        descriptionKey: 'onboarding_fund_wallet.option_paypal_description',
        iconName: IconName.Coin,
      },
      {
        id: 'more_payment_methods',
        labelKey: 'onboarding_fund_wallet.option_more_payment_methods',
        descriptionKey:
          'onboarding_fund_wallet.option_more_payment_methods_description',
        iconName: IconName.AddCard,
      },
    ],
  },
];

const MORE_WAYS_SHEET_ROW_IDS: FundWalletOptionId[] = [
  'paypal',
  'more_payment_methods',
];

interface FundWalletOptionRowProps {
  option: FundWalletOption;
  selectedLabel?: string;
  onPress: (id: FundWalletOptionId) => void;
}

const FundWalletOptionRow = ({
  option,
  selectedLabel,
  onPress,
}: FundWalletOptionRowProps) => {
  const tw = useTailwind();

  return (
    <TouchableOpacity
      onPress={() => onPress(option.id)}
      style={tw.style('flex-row items-center py-4')}
      testID={`${OnboardingFundWalletTestIds.OPTION_PREFIX}${option.id}`}
      accessibilityRole="button"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="h-10 w-10 rounded-full bg-muted"
      >
        <Icon name={option.iconName} size={IconSize.Md} />
      </Box>
      <Box twClassName="flex-1 ml-3">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          testID={
            selectedLabel
              ? `${OnboardingFundWalletTestIds.OPTION_PREFIX}${option.id}${OnboardingFundWalletTestIds.SELECTION_SUFFIX}`
              : undefined
          }
        >
          {selectedLabel ?? strings(option.labelKey)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mt-0.5"
        >
          {strings(option.descriptionKey)}
        </Text>
      </Box>
      <Icon
        name={IconName.ArrowRight}
        size={IconSize.Sm}
        color={IconColor.IconAlternative}
      />
    </TouchableOpacity>
  );
};

const OnboardingFundWallet = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<RouteProp<RootStackParamList, 'OnboardingFundWallet'>>();
  const { onComplete, accountType: routeAccountType } = route.params;
  const reduxAccountType = useSelector(selectOnboardingAccountType);
  const selectedAccountGroup = useSelector(selectSelectedAccountGroup);

  const accountType = routeAccountType ?? reduxAccountType;
  const isRampsUnifiedV2Enabled = useRampsUnifiedV2Enabled();

  const [isMoreWaysSheetVisible, setIsMoreWaysSheetVisible] = useState(false);
  const [moreWaysSheetRow, setMoreWaysSheetRow] =
    useState<MoreWaysToFundSheetRowId | null>(null);
  const [moreWaysSelections, setMoreWaysSelections] = useState<
    Partial<Record<MoreWaysToFundSheetRowId, MoreWaysToFundOptionId>>
  >({});

  const hasTrackedView = React.useRef(false);
  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_VIEWED)
        .addProperties({
          question_type: 'fund_wallet',
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, accountType]);

  const onBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onSkip = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
        .addProperties({
          question_type: 'fund_wallet',
          skipped: true,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    onComplete();
  }, [trackEvent, createEventBuilder, accountType, onComplete]);

  const openMoreWaysSheet = useCallback((rowId: MoreWaysToFundSheetRowId) => {
    setMoreWaysSheetRow(rowId);
    setIsMoreWaysSheetVisible(true);
  }, []);

  const handleMoreWaysSheetClose = useCallback(() => {
    setIsMoreWaysSheetVisible(false);
    setMoreWaysSheetRow(null);
  }, []);

  const handleMoreWaysSelect = useCallback(
    (optionId: MoreWaysToFundOptionId) => {
      if (!moreWaysSheetRow) {
        return;
      }

      setMoreWaysSelections((prev) => ({
        ...prev,
        [moreWaysSheetRow]: optionId,
      }));
      setIsMoreWaysSheetVisible(false);
      setMoreWaysSheetRow(null);
    },
    [moreWaysSheetRow],
  );

  const handleDepositFundOptionPress = useCallback(
    (fundMethod: FundWalletOptionId) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
          .addProperties({
            question_type: 'fund_wallet',
            selected_fund_method: fundMethod,
            skipped: false,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );

      navigateFromOnboardingToDepositFlow(navigation, isRampsUnifiedV2Enabled);
    },
    [
      trackEvent,
      createEventBuilder,
      accountType,
      isRampsUnifiedV2Enabled,
      navigation,
    ],
  );

  const handleReceiveFundOptionPress = useCallback(
    (fundMethod: FundWalletOptionId) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
          .addProperties({
            question_type: 'fund_wallet',
            selected_fund_method: fundMethod,
            skipped: false,
            ...(accountType && { account_type: accountType }),
          })
          .build(),
      );

      if (!selectedAccountGroup?.id) {
        Logger.error(
          new Error(
            'OnboardingFundWallet::handleReceiveFundOptionPress - Missing selectedAccountGroup',
          ),
        );
        return;
      }

      navigateFromOnboardingToReceiveFlow(navigation, {
        groupId: selectedAccountGroup.id,
      });
    },
    [
      trackEvent,
      createEventBuilder,
      accountType,
      navigation,
      selectedAccountGroup?.id,
    ],
  );

  const handleOptionPress = useCallback(
    (id: FundWalletOptionId) => {
      if (ONBOARDING_FUND_WALLET_DEPOSIT_FLOW_OPTION_IDS.includes(id)) {
        handleDepositFundOptionPress(id);
        return;
      }

      if (ONBOARDING_FUND_WALLET_RECEIVE_FLOW_OPTION_IDS.includes(id)) {
        handleReceiveFundOptionPress(id);
        return;
      }

      if (MORE_WAYS_SHEET_ROW_IDS.includes(id)) {
        openMoreWaysSheet(id as MoreWaysToFundSheetRowId);
      }
    },
    [
      handleDepositFundOptionPress,
      handleReceiveFundOptionPress,
      openMoreWaysSheet,
    ],
  );

  const getSelectedLabelForRow = useCallback(
    (rowId: MoreWaysToFundSheetRowId) => {
      const selectedOptionId = moreWaysSelections[rowId];
      if (!selectedOptionId) {
        return undefined;
      }

      const selectedOption = getMoreWaysToFundOptionById(selectedOptionId);
      return strings(selectedOption.labelKey);
    },
    [moreWaysSelections],
  );

  return (
    <View
      style={tw.style('flex-1')}
      testID={OnboardingFundWalletTestIds.SCREEN}
    >
      <SafeAreaView
        edges={{ bottom: 'additive' }}
        style={tw.style('flex-1 bg-default')}
      >
        <HeaderCompactStandard
          includesTopInset
          onBack={onBack}
          backButtonProps={{
            testID: OnboardingFundWalletTestIds.BACK_BUTTON,
          }}
          endAccessory={
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              onPress={onSkip}
              testID={OnboardingFundWalletTestIds.SKIP_BUTTON}
            >
              {strings('onboarding_fund_wallet.skip')}
            </Text>
          }
        />

        <Box twClassName="mx-4 mb-4">
          <Text
            variant={TextVariant.DisplayMd}
            color={TextColor.TextDefault}
            fontWeight={FontWeight.Bold}
          >
            {strings('onboarding_fund_wallet.title')}
          </Text>
        </Box>

        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 pb-4')}
          showsVerticalScrollIndicator={false}
        >
          {FUND_WALLET_SECTIONS.map((section, sectionIndex) => (
            <Box
              key={section.titleKey}
              twClassName={
                sectionIndex > 0 ? 'mt-2 border-t border-border-muted pt-4' : ''
              }
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
                twClassName="uppercase mb-1"
              >
                {strings(section.titleKey)}
              </Text>
              <Box flexDirection={BoxFlexDirection.Column}>
                {section.options.map((option) => {
                  const isMoreWaysRow = MORE_WAYS_SHEET_ROW_IDS.includes(
                    option.id,
                  );
                  const selectedLabel = isMoreWaysRow
                    ? getSelectedLabelForRow(
                        option.id as MoreWaysToFundSheetRowId,
                      )
                    : undefined;

                  return (
                    <FundWalletOptionRow
                      key={option.id}
                      option={option}
                      selectedLabel={selectedLabel}
                      onPress={handleOptionPress}
                    />
                  );
                })}
              </Box>
            </Box>
          ))}
        </ScrollView>
      </SafeAreaView>

      {isMoreWaysSheetVisible && moreWaysSheetRow ? (
        <MoreWaysToFundBottomSheet
          selectedOptionId={moreWaysSelections[moreWaysSheetRow]}
          onClose={handleMoreWaysSheetClose}
          onSelect={handleMoreWaysSelect}
        />
      ) : null}
    </View>
  );
};

export default OnboardingFundWallet;
