import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Keyboard, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  BottomSheetFooter,
  Box,
  Button,
  ButtonSize,
  ButtonsAlignment,
  ButtonVariant,
  HeaderStandard,
  ListItemMultiSelect,
  ListItemVariant,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import TitleStandard from '../../../component-library/components-temp/TitleStandard';
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
      <HeaderStandard includesTopInset />

      <Box twClassName="px-4 pb-4">
        <TitleStandard
          title={strings('onboarding_interest_questionnaire.title')}
          bottomLabel={strings('onboarding_interest_questionnaire.description')}
        />
      </Box>

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pb-4 flex-col gap-y-2')}
        showsVerticalScrollIndicator={false}
      >
        {INTEREST_OPTIONS.map((option) => {
          const isSelected = selectedIds.has(option.id);
          const isOtherOption = option.id === 'other';
          return (
            <ListItemMultiSelect
              key={option.id}
              variant={ListItemVariant.OneLine}
              isSelected={isSelected}
              onPress={() => handleOptionPress(option.id)}
              twClassName={`rounded-full border px-6 py-4 ${
                isSelected ? 'border-icon-default' : 'border-muted'
              }`}
              startAccessory={
                <Text
                  variant={TextVariant.HeadingMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {option.emoji}
                </Text>
              }
              title={strings(option.labelKey)}
              titleEndAccessory={
                isOtherOption && otherText?.length > 0 ? (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    testID={OnboardingInterestQuestionnaireTestIds.OTHER_TEXT}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    twClassName="flex-shrink"
                  >
                    {otherText}
                  </Text>
                ) : null
              }
              testID={`${OnboardingInterestQuestionnaireTestIds.OPTION_PREFIX}${option.id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            />
          );
        })}
      </ScrollView>

      <BottomSheetFooter
        buttonsAlignment={ButtonsAlignment.Vertical}
        twClassName="pt-2"
        primaryButtonProps={{
          children: strings('onboarding_interest_questionnaire.done'),
          onPress: onNext,
          size: ButtonSize.Lg,
          isDisabled: selectedIds.size === 0,
          testID: OnboardingInterestQuestionnaireTestIds.CONTINUE_BUTTON,
        }}
      />
      <Box twClassName="px-4 py-2">
        <Button
          variant={ButtonVariant.Tertiary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onSkip}
          testID={OnboardingInterestQuestionnaireTestIds.SKIP_BUTTON}
        >
          {strings('onboarding_interest_questionnaire.skip')}
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
