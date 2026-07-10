import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StatusBar,
  type ImageSourcePropType,
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
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { InterestOptionCard } from './InterestOptionCard';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import Routes from '../../../constants/navigation/Routes';
import { OnboardingInterestQuestionnaireTestIds } from './OnboardingInterestQuestionnaire.testIds';
import buyAndSellCryptoImage from '../../../images/buy_and_sell_crypto.png';
import consolidateWalletsImage from '../../../images/consolidate_wallets.png';
import advancedTradesImage from '../../../images/advanced_trades.png';
import predictSportsEventsImage from '../../../images/predict_sports_events.png';
import cryptoAsMoneyImage from '../../../images/crypto_as_money.png';
import connectAppsSitesImage from '../../../images/connect_apps_sites.png';

type InterestOptionId =
  | 'buy_and_sell_crypto'
  | 'consolidate_wallets'
  | 'advanced_trades'
  | 'predict_sports_events'
  | 'crypto_as_money'
  | 'connect_apps_sites';

interface InterestOption {
  id: InterestOptionId;
  labelKey: string;
}

const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'buy_and_sell_crypto',
    labelKey: 'onboarding_interest_questionnaire.option_buy_and_sell_crypto',
  },
  {
    id: 'consolidate_wallets',
    labelKey: 'onboarding_interest_questionnaire.option_consolidate_wallets',
  },
  {
    id: 'advanced_trades',
    labelKey: 'onboarding_interest_questionnaire.option_advanced_trades',
  },
  {
    id: 'predict_sports_events',
    labelKey: 'onboarding_interest_questionnaire.option_predict_sports_events',
  },
  {
    id: 'crypto_as_money',
    labelKey: 'onboarding_interest_questionnaire.option_crypto_as_money',
  },
  {
    id: 'connect_apps_sites',
    labelKey: 'onboarding_interest_questionnaire.option_connect_apps_sites',
  },
];

const INTEREST_OPTION_IMAGES: Record<InterestOptionId, ImageSourcePropType> = {
  buy_and_sell_crypto: buyAndSellCryptoImage,
  consolidate_wallets: consolidateWalletsImage,
  advanced_trades: advancedTradesImage,
  predict_sports_events: predictSportsEventsImage,
  crypto_as_money: cryptoAsMoneyImage,
  connect_apps_sites: connectAppsSitesImage,
};

const INTEREST_OPTION_ROWS = [
  INTEREST_OPTIONS.slice(0, 2),
  INTEREST_OPTIONS.slice(2, 4),
  INTEREST_OPTIONS.slice(4, 6),
];

/** 8px gutters between 2-column grid cells (4px padding per column side). */
const GRID_GUTTER_PX = 4;

const OnboardingInterestQuestionnaire = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'OnboardingInterestQuestionnaire'>
    >();
  const { onComplete, accountType: routeAccountType } = route.params;
  const reduxAccountType = useSelector(selectOnboardingAccountType);

  const accountType = routeAccountType ?? reduxAccountType;

  const [selectedIds, setSelectedIds] = useState<Set<InterestOptionId>>(
    new Set(),
  );

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

  /**
   * Block hardware back so users cannot return to OptinMetrics beneath this screen
   * (avoids duplicate opt-in / analytics). No alert — questionnaire has no back affordance.
   */
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

  const onContinue = useCallback(() => {
    const selectedInterests = Array.from(selectedIds);
    const skipped = selectedInterests.length === 0;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
        .addProperties({
          question_type: 'interest',
          selected_interests: selectedInterests,
          item_count: selectedInterests.length,
          skipped,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    navigation.navigate(Routes.ONBOARDING.CRYPTO_EXPERIENCE_QUESTIONNAIRE, {
      onComplete,
      ...(accountType && { accountType }),
    });
  }, [
    selectedIds,
    trackEvent,
    createEventBuilder,
    accountType,
    onComplete,
    navigation,
  ]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default', {
        paddingTop:
          Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 40,
      })}
      testID={OnboardingInterestQuestionnaireTestIds.SCREEN}
    >
      <Box twClassName="mx-4 mt-4 mb-2">
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
        <Box twClassName="py-2">
          {INTEREST_OPTION_ROWS.map((rowOptions, rowIndex) => (
            <Box
              key={rowOptions.map((option) => option.id).join('-')}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Stretch}
              testID={`${OnboardingInterestQuestionnaireTestIds.GRID_ROW_PREFIX}${rowIndex}`}
              style={tw.style({
                marginHorizontal: -GRID_GUTTER_PX,
                marginBottom: GRID_GUTTER_PX * 2,
              })}
            >
              {rowOptions.map((option) => (
                <Box
                  key={option.id}
                  style={tw.style({
                    width: '50%',
                    paddingHorizontal: GRID_GUTTER_PX,
                  })}
                >
                  <InterestOptionCard
                    labelKey={option.labelKey}
                    imageSource={INTEREST_OPTION_IMAGES[option.id]}
                    isSelected={selectedIds.has(option.id)}
                    onPress={() => toggleOption(option.id)}
                    testID={`${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${option.id}`}
                  />
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </ScrollView>

      <Box twClassName="px-4 py-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onContinue}
          style={tw.style('w-full')}
          testID={OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON}
        >
          {strings('onboarding_interest_questionnaire.continue')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default OnboardingInterestQuestionnaire;
