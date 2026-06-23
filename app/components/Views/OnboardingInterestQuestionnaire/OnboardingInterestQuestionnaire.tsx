import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Image,
  type ImageSourcePropType,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
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
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  TextButton,
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { InterestSelectionIndicator } from './InterestSelectionIndicator';
import OtherBottomSheet from './OtherBottomSheet';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import { setOnboardingInterests } from '../../../actions/onboarding';
import { selectAccountGroupBalanceForEmptyState } from '../../../selectors/assets/balances';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { OnboardingInterestQuestionnaireTestIds } from './OnboardingInterestQuestionnaire.testIds';
import buyAndSellCryptoImage from '../../../images/buy_and_sell_crypto.png';
import advancedTradesImage from '../../../images/advanced_trades.png';
import predictSportsEventsImage from '../../../images/predict_sports_events.png';
import cryptoAsMoneyImage from '../../../images/crypto_as_money.png';
import connectAppsSitesImage from '../../../images/connect_apps_sites.png';
import consolidateWalletsImage from '../../../images/consolidate_wallets.png';

type InterestOptionId =
  | 'swap_tokens'
  | 'trade_perpetuals'
  | 'prediction_markets'
  | 'send_receive_crypto'
  | 'earn_and_spend'
  | 'use_other_crypto_apps'
  | 'other';

interface InterestOption {
  id: InterestOptionId;
  labelKey: string;
}

const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'swap_tokens',
    labelKey: 'onboarding_interest_questionnaire.option_swap_tokens',
  },
  {
    id: 'trade_perpetuals',
    labelKey: 'onboarding_interest_questionnaire.option_trade_perpetuals',
  },
  {
    id: 'prediction_markets',
    labelKey: 'onboarding_interest_questionnaire.option_prediction_markets',
  },
  {
    id: 'send_receive_crypto',
    labelKey: 'onboarding_interest_questionnaire.option_send_receive_crypto',
  },
  {
    id: 'earn_and_spend',
    labelKey: 'onboarding_interest_questionnaire.option_earn_and_spend',
  },
  {
    id: 'use_other_crypto_apps',
    labelKey: 'onboarding_interest_questionnaire.option_use_other_crypto_apps',
  },
  {
    id: 'other',
    labelKey: 'onboarding_interest_questionnaire.option_other',
  },
];

const INTEREST_OPTION_IMAGES: Partial<
  Record<InterestOptionId, ImageSourcePropType>
> = {
  swap_tokens: buyAndSellCryptoImage,
  trade_perpetuals: advancedTradesImage,
  prediction_markets: predictSportsEventsImage,
  send_receive_crypto: cryptoAsMoneyImage,
  earn_and_spend: consolidateWalletsImage,
  use_other_crypto_apps: connectAppsSitesImage,
};

const INTEREST_OPTION_ICONS: Partial<Record<InterestOptionId, IconName>> = {
  other: IconName.Edit,
};

const OnboardingInterestQuestionnaire = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'OnboardingInterestQuestionnaire'>
    >();
  const { onComplete, accountType: routeAccountType } = route.params;
  const dispatch = useDispatch();
  const reduxAccountType = useSelector(selectOnboardingAccountType);

  const accountType = routeAccountType ?? reduxAccountType;
  const accountGroupBalance = useSelector(
    selectAccountGroupBalanceForEmptyState,
  );
  const walletHasFunds =
    (accountGroupBalance?.totalBalanceInUserCurrency ?? 0) > 0;

  const [selectedIds, setSelectedIds] = useState<Set<InterestOptionId>>(
    new Set(),
  );
  const [isOtherBottomSheetVisible, setIsOtherBottomSheetVisible] =
    useState(false);
  const [otherText, setOtherText] = useState('');

  const hasTrackedView = React.useRef(false);
  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_VIEWED)
        .addProperties({
          question_type: 'interest',
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, accountType]);

  const handleBackPress = useCallback(() => true, []);

  useEffect(() => {
    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );

    return () => {
      backHandlerSubscription.remove();
    };
  }, [handleBackPress]);

  const toggleOption = useCallback((id: InterestOptionId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleOptionPress = useCallback(
    (id: InterestOptionId) => {
      if (id === 'other') {
        setIsOtherBottomSheetVisible(true);
        return;
      }
      toggleOption(id);
    },
    [toggleOption],
  );

  const handleOtherBottomSheetClose = useCallback(() => {
    setIsOtherBottomSheetVisible(false);
  }, []);

  const handleOtherDone = useCallback((value: string) => {
    setOtherText(value);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add('other');
      return next;
    });
    setIsOtherBottomSheetVisible(false);
  }, []);

  const onNext = useCallback(() => {
    const selectedInterests = Array.from(selectedIds);

    dispatch(
      setOnboardingInterests({
        interests: selectedInterests,
        ...(otherText && { otherText }),
      }),
    );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
        .addProperties({
          question_type: 'interest',
          selected_interests: selectedInterests,
          ...(otherText && { other_text: otherText }),
          item_count: selectedInterests.length,
          skipped: selectedInterests.length === 0,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    if (walletHasFunds) {
      onComplete();
      return;
    }

    navigation.navigate(Routes.ONBOARDING.FUND_WALLET, {
      onComplete,
      ...(accountType && { accountType }),
      selectedInterests,
      ...(otherText && { otherText }),
    });
  }, [
    selectedIds,
    otherText,
    dispatch,
    trackEvent,
    createEventBuilder,
    accountType,
    onComplete,
    navigation,
    walletHasFunds,
  ]);

  const onSkip = useCallback(() => {
    dispatch(setOnboardingInterests({ interests: [] }));

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
        .addProperties({
          question_type: 'interest',
          selected_interests: [],
          item_count: 0,
          skipped: true,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    onComplete();
  }, [dispatch, trackEvent, createEventBuilder, accountType, onComplete]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default')}
      testID={OnboardingInterestQuestionnaireTestIds.SCREEN}
    >
      <HeaderCompactStandard
        includesTopInset
        twClassName="mb-2"
        endAccessory={
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            onPress={onSkip}
            testID={OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON}
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
          {strings('onboarding_interest_questionnaire.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('onboarding_interest_questionnaire.description')}
        </Text>
      </Box>

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pb-4')}
        showsVerticalScrollIndicator={false}
      >
        {INTEREST_OPTIONS.map((option) => {
          const isSelected = selectedIds.has(option.id);
          const isOtherOption = option.id === 'other';
          const optionIcon = INTEREST_OPTION_ICONS[option.id];
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleOptionPress(option.id)}
              style={tw.style(
                'flex-row items-center rounded-full px-4 py-3 mb-3 border-2',
                isSelected ? 'border-default' : 'border-border-muted',
              )}
              testID={`${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${option.id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              {INTEREST_OPTION_IMAGES[option.id] ? (
                <Image
                  source={INTEREST_OPTION_IMAGES[option.id]}
                  style={tw.style('h-8 w-8')}
                  resizeMode="contain"
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
              ) : optionIcon ? (
                <Box
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                  twClassName="h-8 w-8 rounded-full bg-muted"
                  testID={`${OnboardingInterestQuestionnaireTestIds.OPTION_ICON_PREFIX}${option.id}`}
                >
                  <Icon
                    name={optionIcon}
                    size={IconSize.Md}
                    color={IconColor.IconDefault}
                  />
                </Box>
              ) : (
                <Box twClassName="h-8 w-8" />
              )}
              <Box twClassName="flex-1 ml-3">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings(option.labelKey)}
                </Text>
                {isOtherOption && otherText ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    twClassName="mt-1"
                    testID={OnboardingInterestQuestionnaireTestIds.OTHER_TEXT}
                  >
                    {otherText}
                  </Text>
                ) : null}
              </Box>
              <InterestSelectionIndicator isSelected={isSelected} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Box twClassName="px-4 py-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onNext}
          style={tw.style('w-full')}
          testID={OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON}
        >
          {strings('onboarding_interest_questionnaire.next')}
        </Button>
      </Box>

      {isOtherBottomSheetVisible ? (
        <OtherBottomSheet
          initialValue={otherText}
          onClose={handleOtherBottomSheetClose}
          onDone={handleOtherDone}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default OnboardingInterestQuestionnaire;
