import React, { useState, useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ReusableModal, { ReusableModalRef } from '../../../UI/ReusableModal';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icon';
import { useStyles } from '../../../hooks/useStyles';
import { strings } from '../../../../../locales/i18n';
import analyticsV2 from '../../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../../core/Analytics';

import { QuizStage } from '../types';
import { QuizContent } from '../QuizContent';
import stylesheet from './styles';

const QuizModal = () => {
  const modalRef = useRef<ReusableModalRef>(null);
  const [stage, setStage] = useState<QuizStage>(QuizStage.introduction);
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const navigation = useNavigation();

  const dismissModal = () => {
    modalRef.current?.dismissModal();
  };

  const wrongAnswerIcon = useCallback(
    () => (
      <Icon
        size={IconSize.Xl}
        name={IconName.DangerFilled}
        color={colors.error.default}
      />
    ),
    [colors.error.default],
  );

  const rightAnswerIcon = useCallback(
    () => (
      <Icon
        size={IconSize.Xl}
        name={IconName.CheckCircleOnFilled}
        color={colors.success.default}
      />
    ),
    [colors.success.default],
  );

  const goToRevealPrivateCredential = () => {
    navigation.navigate('RevealPrivateCredentialView', {
      privateCredentialName: 'seed_phrase',
    });
  };

  const quizPage = useCallback(() => {
    switch (stage) {
      case QuizStage.introduction:
        analyticsV2.trackEvent(
          MetaMetricsEvents.SRP_REVEAL_QUIZ_PROMPT_SEEN,
          {},
        );
        return (
          <QuizContent
            header={strings('srp_security_quiz.title')}
            title={{
              content: strings('srp_security_quiz.introduction'),
            }}
            buttons={[
              {
                label: strings('srp_security_quiz.get_started'),
                onPress: () => {
                  analyticsV2.trackEvent(
                    MetaMetricsEvents.SRP_REVEAL_START_CTA_SELECTED,
                    {},
                  );
                  setStage(QuizStage.questionOne);
                },
                variant: ButtonVariants.Primary,
              },
            ]}
            dismiss={dismissModal}
          />
        );
      case QuizStage.questionOne:
        analyticsV2.trackEvent(
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
            ]}
            dismiss={dismissModal}
          />
        );
      case QuizStage.rightAnswerQuestionOne:
        analyticsV2.trackEvent(
          MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_RIGHT_ASNWER,
          {},
        );
        return (
          <QuizContent
            header={`1 ${strings('srp_security_quiz.of')} 2`}
            icon={rightAnswerIcon}
            title={{
              content: strings(
                'srp_security_quiz.question_one.right_answer_title',
              ),
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
            ]}
            dismiss={dismissModal}
          />
        );
      case QuizStage.wrongAnswerQuestionOne:
        analyticsV2.trackEvent(
          MetaMetricsEvents.SRP_REVEAL_FIRST_QUESTION_WRONG_ANSWER,
          {},
        );
        return (
          <QuizContent
            header={`1 ${strings('srp_security_quiz.of')} 2`}
            icon={wrongAnswerIcon}
            title={{
              content: strings(
                'srp_security_quiz.question_one.wrong_answer_title',
              ),
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
            ]}
            dismiss={dismissModal}
          />
        );
      case QuizStage.questionTwo:
        analyticsV2.trackEvent(
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
            ]}
            dismiss={dismissModal}
          />
        );
      case QuizStage.rightAnswerQuestionTwo:
        analyticsV2.trackEvent(
          MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_RIGHT_ASNWER,
          {},
        );
        return (
          <QuizContent
            header={`2 ${strings('srp_security_quiz.of')} 2`}
            icon={rightAnswerIcon}
            title={{
              content: strings(
                'srp_security_quiz.question_two.right_answer_title',
              ),
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
            ]}
            dismiss={dismissModal}
          />
        );
      case QuizStage.wrongAnswerQuestionTwo:
        analyticsV2.trackEvent(
          MetaMetricsEvents.SRP_REVEAL_SECOND_QUESTION_WRONG_ANSWER,
          {},
        );
        return (
          <QuizContent
            header={`2 ${strings('srp_security_quiz.of')} 2`}
            icon={wrongAnswerIcon}
            title={{
              content: strings(
                'srp_security_quiz.question_two.wrong_answer_title',
              ),
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
            ]}
            dismiss={dismissModal}
          />
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, stage, rightAnswerIcon, wrongAnswerIcon]);

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>{quizPage()}</View>
    </ReusableModal>
  );
};

export default QuizModal;
