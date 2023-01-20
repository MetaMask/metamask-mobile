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

import { QuizStage } from '../quizStructure';
import { QuizContent } from '../QuizContent';
import stylesheet from './styles';

const QuizModal = () => {
  const modalRef = useRef<ReusableModalRef>(null);
  const [stage, setStage] = useState<QuizStage>(QuizStage.introduction);
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const navigation = useNavigation();

  const wrongAnswerIcon = () => (
    <Icon
      size={IconSize.Xl}
      name={IconName.DangerFilled}
      color={colors.error.default}
      // style={styles.icon}
    />
  );

  const rightAnswerIcon = () => (
    <Icon
      size={IconSize.Xl}
      name={IconName.CheckCircleOnFilled}
      color={colors.success.default}
      // style={styles.icon}
    />
  );

  const quizPage = useCallback(() => {
    switch (stage) {
      case QuizStage.introduction:
        return (
          <QuizContent
            header={strings('srp_security_quiz.title')}
            title={strings('srp_security_quiz.introduction')}
            buttons={[
              {
                label: strings('srp_security_quiz.get_started'),
                onPress: () => setStage(QuizStage.questionOne),
                variant: ButtonVariants.Primary,
              },
            ]}
          />
        );
      case QuizStage.questionOne:
        return (
          <QuizContent
            header={`1 ${strings('srp_security_quiz.of')} 2`}
            title={strings('srp_security_quiz.question_one.question')}
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
          />
        );
      case QuizStage.rightAnswerQuestionOne:
        return (
          <QuizContent
            header={`1 ${strings('srp_security_quiz.of')} 2`}
            icon={rightAnswerIcon}
            title={strings('srp_security_quiz.question_one.right_answer_title')}
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
          />
        );
      case QuizStage.wrongAnswerQuestionOne:
        return (
          <QuizContent
            header={`1 ${strings('srp_security_quiz.of')} 2`}
            icon={wrongAnswerIcon}
            title={strings('srp_security_quiz.question_one.wrong_answer_title')}
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
          />
        );
      case QuizStage.questionTwo:
        return (
          <QuizContent
            header={`2 ${strings('srp_security_quiz.of')} 2`}
            title={strings('srp_security_quiz.question_two.question')}
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
          />
        );
      case QuizStage.rightAnswerQuestionTwo:
        return (
          <QuizContent
            header={`2 ${strings('srp_security_quiz.of')} 2`}
            icon={rightAnswerIcon}
            title={strings('srp_security_quiz.question_two.right_answer_title')}
            content={strings(
              'srp_security_quiz.question_two.right_answer_description',
            )}
            buttons={[
              {
                label: strings('srp_security_quiz.continue'),
                onPress: () => navigation.navigate('FiatOnRampAggregator'),
                variant: ButtonVariants.Primary,
              },
            ]}
          />
        );
      case QuizStage.wrongAnswerQuestionTwo:
        return (
          <QuizContent
            header={`2 ${strings('srp_security_quiz.of')} 2`}
            icon={wrongAnswerIcon}
            title={strings('srp_security_quiz.question_two.wrong_answer_title')}
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
          />
        );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>{quizPage()}</View>
    </ReusableModal>
  );
};

export default QuizModal;
