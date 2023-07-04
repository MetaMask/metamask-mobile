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
import AnalyticsV2 from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Routes from '../../../../constants/navigation/Routes';
import { SRP_GUIDE_URL } from '../../../../constants/urls';

import { QuizStage } from '../types';
import { QuizContent } from '../QuizContent';
import stylesheet from './styles';

const introductionImg = require('../../../../images/reveal-srp.png');

const SRPQuiz = () => {
  const modalRef = useRef<ReusableModalRef>(null);
  const [stage, setStage] = useState<QuizStage>(QuizStage.introduction);
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const navigation = useNavigation();

  const dismissModal = (): void => {
    modalRef.current?.dismissModal();
  };

  useEffect(() => {
    const appStateListener = AppState.addEventListener('change', dismissModal);
    return () => {
      appStateListener.remove();
    };
  }, []);

  const openSupportArticle = (): void => {
    Linking.openURL(SRP_GUIDE_URL);
  };

  const wrongAnswerIcon = useCallback(
    (): Element => (
      <Icon
        size={IconSize.Xl}
        name={IconName.Danger}
        color={colors.error.default}
      />
    ),
    [colors.error.default],
  );

  const rightAnswerIcon = useCallback(
    (): Element => (
      <Icon
        size={IconSize.Xl}
        name={IconName.Confirmation}
        color={colors.success.default}
      />
    ),
    [colors.success.default],
  );

  const goToRevealPrivateCredential = useCallback((): void => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_SRP_INITIATED, {});
    AnalyticsV2.trackEvent(MetaMetricsEvents.REVEAL_SRP_CTA, {});
    navigation.navigate(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL, {
      credentialName: 'seed_phrase',
      shouldUpdateNav: true,
    });
  }, [navigation]);

  const introduction = useCallback(() => {
    AnalyticsV2.trackEvent(MetaMetricsEvents.SRP_REVEAL_QUIZ_PROMPT_SEEN, {});
    return (
      <QuizContent
        header={strings('srp_security_quiz.title')}
        image={introductionImg}
        title={{
          content: strings('srp_security_quiz.introduction'),
        }}
        buttons={[
          {
            label: strings('srp_security_quiz.get_started'),
            onPress: () => {
              AnalyticsV2.trackEvent(
                MetaMetricsEvents.SRP_REVEAL_START_CTA_SELECTED,
                {},
              );
              setStage(QuizStage.questionOne);
            },
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
  }, []);

  const questionOne = useCallback((): Element => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_SEEN,
      {},
    );
    return (
      <QuizContent
        header={`1 ${strings('srp_security_quiz.of')} 2`}
        title={{
          content: strings('srp_security_quiz.question_one.question'),
        }}
        buttons={[
          {
            label: strings('srp_security_quiz.question_one.wrong_answer'),
            onPress: () => setStage(QuizStage.wrongAnswerQuestionOne),
            variant: ButtonVariants.Secondary,
          },
          {
            label: strings('srp_security_quiz.question_one.right_answer'),
            onPress: () => setStage(QuizStage.rightAnswerQuestionOne),
            variant: ButtonVariants.Secondary,
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
  }, []);

  const rightAnswerQuestionOne = useCallback((): Element => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_RIGHT_ASNWER,
      {},
    );
    return (
      <QuizContent
        header={`1 ${strings('srp_security_quiz.of')} 2`}
        icon={rightAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_one.right_answer_title'),
          style: styles.rightText,
        }}
        content={strings(
          'srp_security_quiz.question_one.right_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.continue'),
            onPress: () => setStage(QuizStage.questionTwo),
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
  }, [rightAnswerIcon, styles.rightText]);

  const wrongAnswerQuestionOne = useCallback((): Element => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_WRONG_ANSWER,
      {},
    );
    return (
      <QuizContent
        header={`1 ${strings('srp_security_quiz.of')} 2`}
        icon={wrongAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_one.wrong_answer_title'),
          style: styles.wrongText,
        }}
        content={strings(
          'srp_security_quiz.question_one.wrong_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.try_again'),
            onPress: () => setStage(QuizStage.questionOne),
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
  }, [styles.wrongText, wrongAnswerIcon]);

  const questionTwo = useCallback((): Element => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_SEEN,
      {},
    );
    return (
      <QuizContent
        header={`2 ${strings('srp_security_quiz.of')} 2`}
        title={{
          content: strings('srp_security_quiz.question_two.question'),
        }}
        buttons={[
          {
            label: strings('srp_security_quiz.question_two.right_answer'),
            onPress: () => setStage(QuizStage.rightAnswerQuestionTwo),
            variant: ButtonVariants.Secondary,
          },
          {
            label: strings('srp_security_quiz.question_two.wrong_answer'),
            onPress: () => setStage(QuizStage.wrongAnswerQuestionTwo),
            variant: ButtonVariants.Secondary,
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
  }, []);

  const rightAnswerQuestionTwo = useCallback((): Element => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_RIGHT_ASNWER,
      {},
    );
    return (
      <QuizContent
        header={`2 ${strings('srp_security_quiz.of')} 2`}
        icon={rightAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_two.right_answer_title'),
          style: styles.rightText,
        }}
        content={strings(
          'srp_security_quiz.question_two.right_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.continue'),
            onPress: goToRevealPrivateCredential,
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
  }, [goToRevealPrivateCredential, rightAnswerIcon, styles.rightText]);

  const wrongAnswerQuestionTwo = useCallback((): Element => {
    AnalyticsV2.trackEvent(
      MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_WRONG_ANSWER,
      {},
    );
    return (
      <QuizContent
        header={`2 ${strings('srp_security_quiz.of')} 2`}
        icon={wrongAnswerIcon}
        title={{
          content: strings('srp_security_quiz.question_two.wrong_answer_title'),
          style: styles.wrongText,
        }}
        content={strings(
          'srp_security_quiz.question_two.wrong_answer_description',
        )}
        buttons={[
          {
            label: strings('srp_security_quiz.try_again'),
            onPress: () => setStage(QuizStage.questionTwo),
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
  }, [styles.wrongText, wrongAnswerIcon]);

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
