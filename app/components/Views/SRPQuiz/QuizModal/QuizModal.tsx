import React, { useState, useCallback, useRef } from 'react';
import { View } from 'react-native';
// import { useNavigation } from '@react-navigation/native';
import ReusableModal, { ReusableModalRef } from '../../../UI/ReusableModal';
import Text, {
  TextVariants,
} from '../../../../component-library/components/Texts/Text';
import Button, { ButtonSize, ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icon';
import { useStyles } from '../../../hooks/useStyles';
import { strings } from '../../../../../locales/i18n';

import { QuizStage } from '../quizStructure';
import { QuizInformation } from '../QuizInformation';
import stylesheet from './styles';

const QuizModal = () => {
  const modalRef = useRef<ReusableModalRef>(null);
  const [stage, setStage] = useState<QuizStage>(QuizStage.introduction);
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  // const navigation = useNavigation();

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
          <QuizInformation
            styles={styles.bodyContainer}
            header={'Header 1'}
            title={strings('srp_security_quiz.introduction')}
            content={'Content 1'}
            btnLabel={strings('srp_security_quiz.get_started')}
            onContinuePress={() => setStage(QuizStage.questionOne)}
          />
        );
      case QuizStage.questionOne:
        return (
          <QuizInformation
            styles={styles.bodyContainer}
            header={'Header 2'}
            title={'Title 2'}
            content={'Content 2'}
            btnLabel={strings('srp_security_quiz.get_started')}
            onContinuePress={() => setStage(QuizStage.questionTwo)}
          />
        );
      case QuizStage.rightAnswerQuestionOne:
        return <View />;
      case QuizStage.wrongAnswerQuestionOne:
        return <View />;
      case QuizStage.questionTwo:
        return <View />;
      case QuizStage.rightAnswerQuestionTwo:
        return <View />;
      case QuizStage.wrongAnswerQuestionTwo:
        return <View />;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return (
    <ReusableModal ref={modalRef} style={styles.screen}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text
            variant={TextVariants.sHeadingSMRegular}
            style={styles.headerText}
          >
            header
          </Text>
          <Icon
            size={IconSize.Xs}
            name={IconName.CloseOutline}
            color={colors.icon.default}
            style={styles.icon}
          />
        </View>
        {wrongAnswerIcon()}
        {rightAnswerIcon()}
        {quizPage()}
      </View>
    </ReusableModal>
  );
};

export default QuizModal;
