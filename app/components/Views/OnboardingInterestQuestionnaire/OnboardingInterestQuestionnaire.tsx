import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Keyboard,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
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
} from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../component-library/components-temp/HeaderCompactStandard';
import { InterestSelectionIndicator } from './InterestSelectionIndicator';
import OtherBottomSheet from './OtherBottomSheet';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import { OnboardingInterestQuestionnaireTestIds } from './OnboardingInterestQuestionnaire.testIds';

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
  emoji?: string;
}

const INTEREST_OPTIONS: InterestOption[] = [
  {
    id: 'swap_tokens',
    labelKey: 'onboarding_interest_questionnaire.option_swap_tokens',
    emoji: '🔄',
  },
  {
    id: 'trade_perpetuals',
    labelKey: 'onboarding_interest_questionnaire.option_trade_perpetuals',
    emoji: '📈',
  },
  {
    id: 'prediction_markets',
    labelKey: 'onboarding_interest_questionnaire.option_prediction_markets',
    emoji: '🔮',
  },
  {
    id: 'send_receive_crypto',
    labelKey: 'onboarding_interest_questionnaire.option_send_receive_crypto',
    emoji: '📥',
  },
  {
    id: 'earn_and_spend',
    labelKey: 'onboarding_interest_questionnaire.option_earn_and_spend',
    emoji: '💰',
  },
  {
    id: 'use_other_crypto_apps',
    labelKey: 'onboarding_interest_questionnaire.option_use_other_crypto_apps',
    emoji: '🌐',
  },
  {
    id: 'other',
    labelKey: 'onboarding_interest_questionnaire.option_other',
    emoji: '📝',
  },
];

const OnboardingInterestQuestionnaire = () => {
  const tw = useTailwind();
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
    Keyboard.dismiss();
    setIsOtherBottomSheetVisible(false);
  }, []);

  const handleOtherDone = useCallback((value: string) => {
    Keyboard.dismiss();
    const isEmpty = value.length === 0;
    setOtherText(isEmpty ? '' : value);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isEmpty) {
        next.delete('other');
      } else {
        next.add('other');
      }
      return next;
    });
    setIsOtherBottomSheetVisible(false);
  }, []);

  const onNext = useCallback(() => {
    const selectedInterests = Array.from(selectedIds);

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

    onComplete();
  }, [
    selectedIds,
    otherText,
    trackEvent,
    createEventBuilder,
    accountType,
    onComplete,
  ]);

  const onSkip = useCallback(() => {
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
  }, [trackEvent, createEventBuilder, accountType, onComplete]);

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
            variant={TextVariant.BodyLg}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            onPress={onSkip}
            testID={OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON}
            style={tw.style('pr-4')}
          >
            {strings('onboarding_interest_questionnaire.skip')}
          </Text>
        }
      />

      <Box twClassName="mx-4 mb-4 flex flex-col gap-y-2">
        <Text
          variant={TextVariant.DisplayMd}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('onboarding_interest_questionnaire.title')}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('onboarding_interest_questionnaire.description')}
        </Text>
      </Box>

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pb-4 flex-col gap-y-4')}
        showsVerticalScrollIndicator={false}
      >
        {INTEREST_OPTIONS.map((option) => {
          const isSelected = selectedIds.has(option.id);
          const isOtherOption = option.id === 'other';
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => handleOptionPress(option.id)}
              style={tw.style(
                'flex-row items-center rounded-full px-6 py-4 border',
                isSelected
                  ? 'border-text-default bg-background-section'
                  : 'border-text-muted',
              )}
              testID={`${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${option.id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {option.emoji}
              </Text>
              <Box twClassName="flex-1 flex-row items-center gap-x-2 ml-3">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings(option.labelKey)}
                </Text>
                {isOtherOption && otherText?.length > 0 ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={OnboardingInterestQuestionnaireTestIds.OTHER_TEXT}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    twClassName="flex-shrink mr-2"
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
          isDisabled={selectedIds.size === 0}
          style={tw.style('w-full')}
          testID={OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON}
        >
          {strings('onboarding_interest_questionnaire.done')}
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
