/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, import/no-commonjs */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Linking, AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReusableModal, { ReusableModalRef } from '../../../UI/ReusableModal';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../hooks/useStyles';
import { strings } from '../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { SRP_GUIDE_URL } from '../../../../constants/urls';

import { QuizStage } from '../types';
import { QuizContent } from '../QuizContent';
import stylesheet from './styles';
import { useMetrics } from '../../../../components/hooks/useMetrics';

import {
  SrpQuizGetStartedSelectorsIDs,
  SrpQuizGetStartedSelectorsText,
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionOneSelectorsText,
  SrpSecurityQuestionTwoSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsText,
} from '../../../../../e2e/selectors/Settings/SecurityAndPrivacy/SrpQuizModal.selectors';
import { selectSeedlessOnboardingLoginFlow } from '../../../../selectors/seedlessOnboardingController';
import { useSelector } from 'react-redux';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../util/navigation/types';

const introductionImg = require('../../../../images/reveal-srp.png');

type SRPQuizProps = StackScreenProps<
  RootParamList,
  'SRPRevealQuiz' | 'SRPRevealQuizInMultichainAccountDetails'
>;

const SRPQuiz = ({ route }: SRPQuizProps) => {
  const keyringId = route.params?.keyringId;
  const modalRef = useRef<ReusableModalRef>(null);
  const [stage, setStage] = useState<QuizStage>(QuizStage.introduction);
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const dismissModal = (): void => {
    modalRef.current?.dismissModal();
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
        color={colors.error.default}
      />
    ),
    [colors.error.default],
  );

  const rightAnswerIcon = useCallback(
    (): React.ReactElement => (
      <Icon
        size={IconSize.Xl}
        name={IconName.Confirmation}
        color={colors.success.default}
      />
    ),
    [colors.success.default],
  );

  const goToRevealPrivateCredential = useCallback((): void => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVEAL_SRP_INITIATED).build(),
    );
    trackEvent(createEventBuilder(MetaMetricsEvents.REVEAL_SRP_CTA).build());
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      credentialName: 'seed_phrase',
      shouldUpdateNav: true,
      keyringId,
    });
  }, [navigation, trackEvent, createEventBuilder, keyringId]);

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
          style: styles.rightText,
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
  }, [
    trackEvent,
    createEventBuilder,
    rightAnswerIcon,
    styles.rightText,
    openSupportArticle,
  ]);

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
          style: styles.wrongText,
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
  }, [
    trackEvent,
    createEventBuilder,
    wrongAnswerIcon,
    styles.wrongText,
    openSupportArticle,
  ]);

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
          style: styles.rightText,
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
    styles.rightText,
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
          style: styles.wrongText,
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
  }, [
    trackEvent,
    createEventBuilder,
    wrongAnswerIcon,
    styles.wrongText,
    openSupportArticle,
  ]);

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
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>{quizPage()}</View>
    </ReusableModal>
  );
};

export default SRPQuiz;
