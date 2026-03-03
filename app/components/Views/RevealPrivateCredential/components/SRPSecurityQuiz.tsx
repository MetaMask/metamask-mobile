import React from 'react';
import { ButtonSize } from '../../../../component-library/components/Buttons/Button';
import ButtonPrimary from '../../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import ButtonSecondary from '../../../../component-library/components/Buttons/Button/variants/ButtonSecondary';
import ButtonLink from '../../../../component-library/components/Buttons/Button/variants/ButtonLink';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { Box } from '../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../UI/Box/box.types';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { ExportCredentialsIds } from '../../MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import {
  SrpSecurityQuestionOneSelectorsIDs,
  SrpSecurityQuestionTwoSelectorsIDs,
} from '../../Quiz/SRPQuiz/SrpQuizModal.testIds';
import { SRPSecurityQuizProps } from '../types';

const SRPSecurityQuiz = ({
  currentQuestionIndex,
  questionAnswered,
  correctAnswer,
  onAnswerClick,
  onContinueClick,
  onLearnMore,
  styles,
}: SRPSecurityQuizProps) => {
  const renderQuestionResult = () => (
    <Box
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.flexStart}
      justifyContent={JustifyContent.flexStart}
      gap={16}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
        gap={8}
      >
        <Icon
          name={correctAnswer ? IconName.Confirmation : IconName.CircleX}
          size={IconSize.Lg}
          color={
            correctAnswer ? IconColor.SuccessDefault : IconColor.ErrorDefault
          }
        />
        <Text
          variant={TextVariant.HeadingLG}
          color={correctAnswer ? TextColor.Success : TextColor.Error}
        >
          {strings(
            correctAnswer
              ? 'srp_security_quiz.correct'
              : 'srp_security_quiz.incorrect',
          )}
        </Text>
      </Box>
      {currentQuestionIndex === 1 && (
        <Box
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.flexStart}
          justifyContent={JustifyContent.flexStart}
          gap={16}
        >
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            {strings(
              correctAnswer
                ? 'srp_security_quiz.question_one.right_answer_title'
                : 'srp_security_quiz.question_one.wrong_answer_title',
            )}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings(
              correctAnswer
                ? 'srp_security_quiz.question_one.right_answer_description'
                : 'srp_security_quiz.question_one.wrong_answer_description',
            )}
          </Text>
        </Box>
      )}
      {currentQuestionIndex === 2 && (
        <Box
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.flexStart}
          justifyContent={JustifyContent.flexStart}
          gap={16}
        >
          <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
            {strings(
              correctAnswer
                ? 'srp_security_quiz.question_two.right_answer_title'
                : 'srp_security_quiz.question_two.wrong_answer_title',
            )}
          </Text>
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {strings(
              correctAnswer
                ? 'srp_security_quiz.question_two.right_answer_description'
                : 'srp_security_quiz.question_two.wrong_answer_description',
            )}
          </Text>
        </Box>
      )}
    </Box>
  );

  const renderAnswerButtons = () => (
    <Box
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.center}
      style={styles.quizButtonContainer}
      gap={16}
    >
      <ButtonSecondary
        onPress={() => onAnswerClick(1)}
        size={ButtonSize.Lg}
        label={strings(
          currentQuestionIndex === 1
            ? 'srp_security_quiz.question_one.wrong_answer'
            : 'srp_security_quiz.question_two.right_answer',
        )}
        testID={
          currentQuestionIndex === 1
            ? SrpSecurityQuestionOneSelectorsIDs.WRONG_ANSWER
            : SrpSecurityQuestionTwoSelectorsIDs.RIGHT_ANSWER
        }
        style={styles.button}
      />
      <ButtonSecondary
        onPress={() => onAnswerClick(2)}
        size={ButtonSize.Lg}
        label={strings(
          currentQuestionIndex === 1
            ? 'srp_security_quiz.question_one.right_answer'
            : 'srp_security_quiz.question_two.wrong_answer',
        )}
        testID={
          currentQuestionIndex === 1
            ? SrpSecurityQuestionOneSelectorsIDs.RIGHT_ANSWER
            : SrpSecurityQuestionTwoSelectorsIDs.WRONG_ANSWER
        }
        style={styles.button}
      />
      <ButtonLink
        onPress={onLearnMore}
        label={strings('multichain_accounts.reveal_srp.learn_more')}
        testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
        style={styles.button}
      />
    </Box>
  );

  const renderAnsweredButtons = () => (
    <Box
      flexDirection={FlexDirection.Column}
      style={styles.quizAnsweredContainer}
      gap={16}
    >
      <ButtonPrimary
        onPress={onContinueClick}
        size={ButtonSize.Lg}
        label={strings(
          correctAnswer
            ? 'srp_security_quiz.continue'
            : 'srp_security_quiz.try_again',
        )}
        testID={
          correctAnswer
            ? currentQuestionIndex === 1
              ? SrpSecurityQuestionOneSelectorsIDs.RIGHT_CONTINUE
              : SrpSecurityQuestionTwoSelectorsIDs.RIGHT_CONTINUE
            : currentQuestionIndex === 1
              ? SrpSecurityQuestionOneSelectorsIDs.WRONG_ANSWER_TRY_AGAIN_BUTTON
              : SrpSecurityQuestionTwoSelectorsIDs.WRONG_ANSWER_TRY_AGAIN_BUTTON
        }
        style={styles.button}
      />
      <ButtonLink
        onPress={onLearnMore}
        label={strings('multichain_accounts.reveal_srp.learn_more')}
        testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
        style={styles.button}
      />
    </Box>
  );

  return (
    <Box
      style={styles.quizQuestionContainer}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.flexStart}
      justifyContent={JustifyContent.flexStart}
    >
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.stepIndicatorContainer}
      >
        {strings('srp_security_quiz.question_step', {
          step: currentQuestionIndex,
          total: 2,
        })}
      </Text>

      {questionAnswered && renderQuestionResult()}

      {!questionAnswered && (
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          style={styles.quizQuestion}
        >
          {strings(
            currentQuestionIndex === 1
              ? 'srp_security_quiz.question_one.question'
              : 'srp_security_quiz.question_two.question',
          )}
        </Text>
      )}

      {!questionAnswered ? renderAnswerButtons() : renderAnsweredButtons()}
    </Box>
  );
};

export default SRPSecurityQuiz;
