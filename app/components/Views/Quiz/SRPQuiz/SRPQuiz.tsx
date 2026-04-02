/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import-x/no-commonjs */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Linking, AppState } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import {
  Box,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { SRP_GUIDE_URL } from '../../../../constants/urls';

import { QuizStage } from '../types';
import { QuizContent } from '../QuizContent';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';

import {
  SrpQuizGetStartedSelectorsIDs,
  SrpQuizGetStartedSelectorsText,
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionOneSelectorsText,
  SrpSecurityQuestionTwoSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsText,
} from './SrpQuizModal.testIds';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { useSelector } from 'react-redux';

const introductionImg = require('../../../../images/reveal_srp.png');

interface SRPQuizRouteParams {
  keyringId?: string;
  /** Forwarded to RevealPrivateCredential when quiz completes (root modal + reveal). */
  dismissModalStackOnDone?: boolean;
}

const SRPQuiz = () => {
  const tw = useTailwind();
  const route = useRoute<RouteProp<{ params: SRPQuizRouteParams }, 'params'>>();
  const {
    params: { keyringId, dismissModalStackOnDone },
  } = route;
  const modalRef = useRef<BottomSheetRef>(null);
  const [stage, setStage] = useState<QuizStage>(QuizStage.introduction);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const dismissModal = (): void => {
    modalRef.current?.onCloseBottomSheet();
  };

  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', dismissModal);
    return () => {
      appStateListener.remove();
    };
  }, []);

  const isSocialLogin = useSelector(selectSeedlessOnboardingLoginFlow);

  const SRP_GUIDE_SOCIAL_LOGIN_URL =
    'https://support.metamask.io/start/user-guide-secret-recovery-phrase-password-and-private-keys/#metamask-secret-recovery-phrase-dos-and-donts';

  const LEARN_MORE_URL = isSocialLogin
    ? SRP_GUIDE_SOCIAL_LOGIN_URL
    : SRP_GUIDE_URL;

  const openSupportArticle = useCallback((): void => {
    Linking.openURL(LEARN_MORE_URL);
  }, [LEARN_MORE_URL]);

  const wrongAnswerIcon = useCallback(
    (): React.ReactElement => (
      <Icon
        size={IconSize.Xl}
        name={IconName.Danger}
        color={IconColor.ErrorDefault}
      />
    ),
    [],
  );

  const rightAnswerIcon = useCallback(
    (): React.ReactElement => (
      <Icon
        size={IconSize.Xl}
        name={IconName.Confirmation}
        color={IconColor.SuccessDefault}
      />
    ),
    [],
  );

  const goToRevealPrivateCredential = useCallback((): void => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVEAL_SRP_INITIATED).build(),
    );
    trackEvent(createEventBuilder(MetaMetricsEvents.REVEAL_SRP_CTA).build());
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      shouldUpdateNav: true,
      keyringId,
      skipQuiz: true,
      ...(dismissModalStackOnDone && { dismissModalStackOnDone: true }),
    });
  }, [
    navigation,
    trackEvent,
    createEventBuilder,
    keyringId,
    dismissModalStackOnDone,
  ]);

  const introduction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.SRP_REVEAL_QUIZ_PROMPT_SEEN).build(),
    );
    return (
      <QuizContent
        header={strings('srp_security_quiz.title')}
        image={introductionImg}
        title={{
          content: strings('srp_security_quiz.introduction'),
          testID: SrpQuizGetStartedSelectorsText.INTRODUCTION,
        }}
        buttons={[
          {
            label: strings('srp_security_quiz.get_started'),
            onPress: () => {
              trackEvent(
                createEventBuilder(
                  MetaMetricsEvents.SRP_REVEAL_START_CTA_SELECTED,
                ).build(),
              );
              setStage(QuizStage.questionOne);
            },
            testID: SrpQuizGetStartedSelectorsIDs.BUTTON,
            variant: ButtonVariants.Primary,
          },
          {
            label: strings('srp_security_quiz.learn_more'),
            onPress: openSupportArticle,
            variant: ButtonVariants.Link,
          },
        ]}
        dismiss={dismissModal}
      />
    );
  }, [trackEvent, createEventBuilder, openSupportArticle]);

  const questionOne = useCallback((): React.ReactElement => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_SEEN,
      ).build(),
    );
    return (
      <QuizContent
        header={`1 ${strings('srp_security_quiz.of')} 2`}
        title={{
          content: strings('srp_security_quiz.question_one.question'),
          testID: SrpSecurityQuestionOneSelectorsText.QUESTION,
        }}
        buttons={[
          {
            label: strings('srp_security_quiz.question_one.wrong_answer'),
            onPress: () => setStage(QuizStage.wrongAnswerQuestionOne),
            variant: ButtonVariants.Secondary,
            testID: SrpSecurityQuestionOneSelectorsIDs.WRONG_ANSWER,
          },
          {
            label: strings('srp_security_quiz.question_one.right_answer'),
            onPress: () => setStage(QuizStage.rightAnswerQuestionOne),
            variant: ButtonVariants.Secondary,
            testID: SrpSecurityQuestionOneSelectorsIDs.RIGHT_ANSWER,
          },
          {
            label: strings('srp_security_quiz.learn_more'),
            onPress: openSupportArticle,
            variant: ButtonVariants.Link,
          },
        ]}
        dismiss={dismissModal}
      />
    );
  }, [trackEvent, createEventBuilder, openSupportArticle]);

  const rightAnswerQuestionOne = useCallback((): React.ReactElement => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_RIGHT_ASNWER,
      ).build(),
    );
    return (
      <QuizContent
        header={`1 ${strings('srp_security_quiz.of')} 2`}
        icon={rightAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_one.right_answer_title'),
          style: tw.style('text-success-default'),
          testID:
            SrpSecurityQuestionOneSelectorsText.RIGHT_ANSWER_RESPONSE_TITLE,
        }}
        content={strings(
          'srp_security_quiz.question_one.right_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.continue'),
            onPress: () => setStage(QuizStage.questionTwo),
            variant: ButtonVariants.Primary,
            testID: SrpSecurityQuestionOneSelectorsIDs.RIGHT_CONTINUE,
          },
          {
            label: strings('srp_security_quiz.learn_more'),
            onPress: openSupportArticle,
            variant: ButtonVariants.Link,
          },
        ]}
        dismiss={dismissModal}
      />
    );
  }, [trackEvent, createEventBuilder, rightAnswerIcon, tw, openSupportArticle]);

  const wrongAnswerQuestionOne = useCallback((): React.ReactElement => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_WRONG_ANSWER,
      ).build(),
    );
    return (
      <QuizContent
        header={`1 ${strings('srp_security_quiz.of')} 2`}
        icon={wrongAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_one.wrong_answer_title'),
          style: tw.style('text-error-default'),
          testID:
            SrpSecurityQuestionOneSelectorsText.WRONG_ANSWER_RESPONSE_TITLE,
        }}
        content={strings(
          'srp_security_quiz.question_one.wrong_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.try_again'),
            onPress: () => setStage(QuizStage.questionOne),
            variant: ButtonVariants.Primary,
            testID:
              SrpSecurityQuestionOneSelectorsIDs.WRONG_ANSWER_TRY_AGAIN_BUTTON,
          },
          {
            label: strings('srp_security_quiz.learn_more'),
            onPress: openSupportArticle,
            variant: ButtonVariants.Link,
          },
        ]}
        dismiss={dismissModal}
      />
    );
  }, [trackEvent, createEventBuilder, wrongAnswerIcon, tw, openSupportArticle]);

  const questionTwo = useCallback((): React.ReactElement => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_SEEN,
      ).build(),
    );
    return (
      <QuizContent
        header={`2 ${strings('srp_security_quiz.of')} 2`}
        title={{
          content: strings('srp_security_quiz.question_two.question'),
          testID: SrpSecurityQuestionTwoSelectorsText.QUESTION,
        }}
        buttons={[
          {
            label: strings('srp_security_quiz.question_two.right_answer'),
            onPress: () => setStage(QuizStage.rightAnswerQuestionTwo),
            variant: ButtonVariants.Secondary,
            testID: SrpSecurityQuestionTwoSelectorsIDs.RIGHT_ANSWER,
          },
          {
            label: strings('srp_security_quiz.question_two.wrong_answer'),
            onPress: () => setStage(QuizStage.wrongAnswerQuestionTwo),
            variant: ButtonVariants.Secondary,
            testID: SrpSecurityQuestionTwoSelectorsIDs.WRONG_ANSWER,
          },
          {
            label: strings('srp_security_quiz.learn_more'),
            onPress: openSupportArticle,
            variant: ButtonVariants.Link,
          },
        ]}
        dismiss={dismissModal}
      />
    );
  }, [trackEvent, createEventBuilder, openSupportArticle]);

  const rightAnswerQuestionTwo = useCallback((): React.ReactElement => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_RIGHT_ASNWER,
      ).build(),
    );
    return (
      <QuizContent
        header={`2 ${strings('srp_security_quiz.of')} 2`}
        icon={rightAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_two.right_answer_title'),
          style: tw.style('text-success-default'),
          testID:
            SrpSecurityQuestionTwoSelectorsText.RIGHT_ANSWER_RESPONSE_TITLE,
        }}
        content={strings(
          'srp_security_quiz.question_two.right_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.continue'),
            onPress: goToRevealPrivateCredential,
            variant: ButtonVariants.Primary,
            testID: SrpSecurityQuestionTwoSelectorsIDs.RIGHT_CONTINUE,
          },
          {
            label: strings('srp_security_quiz.learn_more'),
            onPress: openSupportArticle,
            variant: ButtonVariants.Link,
          },
        ]}
        dismiss={dismissModal}
      />
    );
  }, [
    trackEvent,
    createEventBuilder,
    rightAnswerIcon,
    tw,
    goToRevealPrivateCredential,
    openSupportArticle,
  ]);

  const wrongAnswerQuestionTwo = useCallback((): React.ReactElement => {
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_WRONG_ANSWER,
      ).build(),
    );
    return (
      <QuizContent
        header={`2 ${strings('srp_security_quiz.of')} 2`}
        icon={wrongAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_two.wrong_answer_title'),
          style: tw.style('text-error-default'),
          testID:
            SrpSecurityQuestionTwoSelectorsText.WRONG_ANSWER_RESPONSE_TITLE,
        }}
        content={strings(
          'srp_security_quiz.question_two.wrong_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.try_again'),
            onPress: () => setStage(QuizStage.questionTwo),
            variant: ButtonVariants.Primary,
            testID:
              SrpSecurityQuestionTwoSelectorsIDs.WRONG_ANSWER_TRY_AGAIN_BUTTON,
          },
          {
            label: strings('srp_security_quiz.learn_more'),
            onPress: openSupportArticle,
            variant: ButtonVariants.Link,
          },
        ]}
        dismiss={dismissModal}
      />
    );
  }, [trackEvent, createEventBuilder, wrongAnswerIcon, tw, openSupportArticle]);

  const quizPage = useCallback(() => {
    switch (stage) {
      case QuizStage.introduction:
        return introduction();
      case QuizStage.questionOne:
        return questionOne();
      case QuizStage.rightAnswerQuestionOne:
        return rightAnswerQuestionOne();
      case QuizStage.wrongAnswerQuestionOne:
        return wrongAnswerQuestionOne();
      case QuizStage.questionTwo:
        return questionTwo();
      case QuizStage.rightAnswerQuestionTwo:
        return rightAnswerQuestionTwo();
      case QuizStage.wrongAnswerQuestionTwo:
        return wrongAnswerQuestionTwo();
    }
  }, [
    stage,
    introduction,
    questionOne,
    rightAnswerQuestionOne,
    wrongAnswerQuestionOne,
    questionTwo,
    rightAnswerQuestionTwo,
    wrongAnswerQuestionTwo,
  ]);

  return (
    <BottomSheet ref={modalRef}>
      <Box twClassName="mx-4 min-h-[300px] rounded-[10px] bg-default">
        {quizPage()}
      </Box>
    </BottomSheet>
  );
};

export default SRPQuiz;
