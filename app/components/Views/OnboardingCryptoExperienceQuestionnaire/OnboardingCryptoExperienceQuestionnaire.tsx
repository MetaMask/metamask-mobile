import React, { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StatusBar,
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
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useSelector } from 'react-redux';
import { selectOnboardingAccountType } from '../../../selectors/onboarding';
import type { RootStackParamList } from '../../../core/NavigationService/types';
import { OnboardingCryptoExperienceQuestionnaireTestIds } from './OnboardingCryptoExperienceQuestionnaire.testIds';
import type { CryptoExperienceLevel } from './OnboardingCryptoExperienceQuestionnaire.types';
import { ExperienceSkillBar } from './ExperienceSkillBar';

interface ExperienceOption {
  id: CryptoExperienceLevel;
  labelKey: string;
}

const EXPERIENCE_OPTIONS: ExperienceOption[] = [
  {
    id: 'new',
    labelKey: 'onboarding_crypto_experience_questionnaire.option_new',
  },
  {
    id: 'beginner',
    labelKey: 'onboarding_crypto_experience_questionnaire.option_beginner',
  },
  {
    id: 'intermediate',
    labelKey: 'onboarding_crypto_experience_questionnaire.option_intermediate',
  },
  {
    id: 'advanced',
    labelKey: 'onboarding_crypto_experience_questionnaire.option_advanced',
  },
];

const OnboardingCryptoExperienceQuestionnaire = () => {
  const tw = useTailwind();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const route =
    useRoute<
      RouteProp<RootStackParamList, 'OnboardingCryptoExperienceQuestionnaire'>
    >();
  const { onComplete, accountType: routeAccountType } = route.params;
  const reduxAccountType = useSelector(selectOnboardingAccountType);

  const accountType = routeAccountType ?? reduxAccountType;

  const [selectedLevel, setSelectedLevel] =
    useState<CryptoExperienceLevel | null>(null);

  const hasTrackedView = React.useRef(false);
  useEffect(() => {
    if (hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_VIEWED)
        .addProperties({
          question_type: 'crypto_experience',
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

  const onContinue = useCallback(() => {
    const skipped = selectedLevel === null;

    trackEvent(
      createEventBuilder(MetaMetricsEvents.ONBOARDING_QUESTION_SUBMITTED)
        .addProperties({
          question_type: 'crypto_experience',
          name: selectedLevel,
          skipped,
          ...(accountType && { account_type: accountType }),
        })
        .build(),
    );

    onComplete();
  }, [selectedLevel, trackEvent, createEventBuilder, accountType, onComplete]);

  return (
    <SafeAreaView
      edges={{ bottom: 'additive' }}
      style={tw.style('flex-1 bg-default', {
        paddingTop:
          Platform.OS === 'android' ? StatusBar.currentHeight || 40 : 40,
      })}
      testID={OnboardingCryptoExperienceQuestionnaireTestIds.SCREEN}
    >
      <Box twClassName="mx-4 mt-4 mb-2">
        <Text
          variant={TextVariant.DisplayMd}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('onboarding_crypto_experience_questionnaire.title')}
        </Text>
      </Box>

      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={tw.style('px-4 pb-4')}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="gap-2 py-2">
          {EXPERIENCE_OPTIONS.map((option) => {
            const isSelected = selectedLevel === option.id;

            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => setSelectedLevel(option.id)}
                activeOpacity={0.7}
                style={tw.style(
                  'flex-row items-center rounded-xl border px-3 py-4',
                  isSelected
                    ? 'border-border-default bg-background-muted-hover'
                    : 'border-muted bg-background-muted',
                )}
                testID={`${OnboardingCryptoExperienceQuestionnaireTestIds.OPTION_PREFIX}${option.id}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <ExperienceSkillBar level={option.id} />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  style={tw.style('ml-3 flex-1')}
                >
                  {strings(option.labelKey)}
                </Text>
                {isSelected ? (
                  <Icon
                    name={IconName.Check}
                    size={IconSize.Lg}
                    color={IconColor.IconDefault}
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </Box>
      </ScrollView>

      <Box twClassName="px-4 py-2">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={onContinue}
          style={tw.style('w-full')}
          testID={
            OnboardingCryptoExperienceQuestionnaireTestIds.CONTINUE_BUTTON
          }
        >
          {strings('onboarding_crypto_experience_questionnaire.continue')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default OnboardingCryptoExperienceQuestionnaire;
