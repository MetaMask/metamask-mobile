import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useMoneyFinishSetup } from '../../hooks/useMoneyFinishSetup';
import { MONEY_FINISH_SETUP_TASKS } from '../../constants/moneyFinishSetupTasks';
import MoneyFinishSetupProgressRing from '../MoneyFinishSetupProgressRing';
import { MoneyFinishSetupCardTestIds } from './MoneyFinishSetupCard.testIds';
import { MONEY_FINISH_SETUP_PROGRESS_ANIMATION_MS } from '../MoneyFinishSetupProgressRing/moneyFinishSetupProgressAnimation';

const SUCCESS_HOLD_MS = 1600;

type CompletionPhase = 'progress' | 'success' | 'dismissed';

const MoneyFinishSetupCard = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { completedCount, isTaskComplete, isVisible, totalTasks } =
    useMoneyFinishSetup();
  const [completionPhase, setCompletionPhase] =
    useState<CompletionPhase>('progress');
  const hasObservedIncompleteSetup = useRef(completedCount < totalTasks);
  const completionStarted = useRef(false);
  const hasCelebratedCompletion = useRef(false);

  const isLastStep = completedCount === totalTasks - 1;
  const isComplete = completedCount >= totalTasks;

  useEffect(() => {
    if (!isComplete) {
      hasObservedIncompleteSetup.current = true;
      completionStarted.current = false;
      hasCelebratedCompletion.current = false;
      setCompletionPhase('progress');
    }
  }, [isComplete]);

  useFocusEffect(
    useCallback(() => {
      const shouldCelebrate =
        isComplete &&
        hasObservedIncompleteSetup.current &&
        !completionStarted.current &&
        !hasCelebratedCompletion.current;

      if (!shouldCelebrate) {
        return undefined;
      }

      completionStarted.current = true;
      setCompletionPhase('progress');

      const successTimer = setTimeout(() => {
        setCompletionPhase('success');
      }, MONEY_FINISH_SETUP_PROGRESS_ANIMATION_MS);
      const dismissTimer = setTimeout(() => {
        hasCelebratedCompletion.current = true;
        setCompletionPhase('dismissed');
      }, MONEY_FINISH_SETUP_PROGRESS_ANIMATION_MS + SUCCESS_HOLD_MS);

      return () => {
        clearTimeout(successTimer);
        clearTimeout(dismissTimer);
        completionStarted.current = false;
      };
    }, [isComplete]),
  );

  const subtitle = useMemo(() => {
    if (isComplete) {
      return strings('money.finish_setup.card.subtitle_complete');
    }

    if (isLastStep) {
      return strings('money.finish_setup.card.subtitle_last_step');
    }

    return strings('money.finish_setup.card.subtitle');
  }, [isComplete, isLastStep]);

  const ctaLabel = useMemo(() => {
    if (isLastStep) {
      const remainingTask = MONEY_FINISH_SETUP_TASKS.find(
        (task) => !isTaskComplete(task.id),
      );

      if (remainingTask) {
        return strings(remainingTask.titleKey);
      }
    }

    return strings('money.finish_setup.card.cta');
  }, [isLastStep, isTaskComplete]);

  const handleOpenSheet = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.FINISH_SETUP_SHEET,
    });
  }, [navigation]);

  const shouldShowCompletion =
    isComplete &&
    hasObservedIncompleteSetup.current &&
    completionPhase !== 'dismissed';

  if (!isVisible && !shouldShowCompletion) {
    return null;
  }

  return (
    <Box
      twClassName="mx-4 mt-2 mb-2 rounded-2xl bg-muted p-4 gap-3"
      testID={MoneyFinishSetupCardTestIds.CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
      >
        <MoneyFinishSetupProgressRing
          completedCount={completedCount}
          totalTasks={totalTasks}
          showSuccess={completionPhase === 'success'}
          testID={`${MoneyFinishSetupCardTestIds.CONTAINER}-progress`}
        />
        <Box twClassName="flex-1">
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings(
              isComplete
                ? 'money.finish_setup.card.title_complete'
                : 'money.finish_setup.card.title',
            )}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {subtitle}
          </Text>
        </Box>
      </Box>
      {!isComplete && (
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleOpenSheet}
          isFullWidth
          testID={MoneyFinishSetupCardTestIds.CTA}
          twClassName="mt-1"
        >
          {ctaLabel}
        </Button>
      )}
    </Box>
  );
};

export default MoneyFinishSetupCard;
