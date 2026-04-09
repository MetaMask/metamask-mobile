import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconSize,
  TextButton,
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
}: SRPSecurityQuizProps) => {
  const renderQuestionResult = () => (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Start}
      justifyContent={BoxJustifyContent.Start}
      gap={4}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={1}
      >
        <Icon
          name={correctAnswer ? IconName.Confirmation : IconName.CircleX}
          size={IconSize.Lg}
          color={
            correctAnswer ? IconColor.SuccessDefault : IconColor.ErrorDefault
          }
        />
        <Text
          variant={TextVariant.HeadingLg}
          color={
            correctAnswer ? TextColor.SuccessDefault : TextColor.ErrorDefault
          }
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
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Start}
          gap={4}
        >
          <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
            {strings(
              correctAnswer
                ? 'srp_security_quiz.question_one.right_answer_title'
                : 'srp_security_quiz.question_one.wrong_answer_title',
            )}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Start}
          justifyContent={BoxJustifyContent.Start}
          gap={4}
        >
          <Text variant={TextVariant.HeadingLg} color={TextColor.TextDefault}>
            {strings(
              correctAnswer
                ? 'srp_security_quiz.question_two.right_answer_title'
                : 'srp_security_quiz.question_two.wrong_answer_title',
            )}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
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
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.End}
      justifyContent={BoxJustifyContent.End}
      twClassName="w-full flex-1"
      gap={4}
    >
      <Button
        variant={ButtonVariant.Secondary}
        onPress={() => onAnswerClick(1)}
        size={ButtonSize.Lg}
        testID={
          currentQuestionIndex === 1
            ? SrpSecurityQuestionOneSelectorsIDs.WRONG_ANSWER
            : SrpSecurityQuestionTwoSelectorsIDs.RIGHT_ANSWER
        }
        twClassName="w-full text-center"
      >
        {strings(
          currentQuestionIndex === 1
            ? 'srp_security_quiz.question_one.wrong_answer'
            : 'srp_security_quiz.question_two.right_answer',
        )}
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        onPress={() => onAnswerClick(2)}
        size={ButtonSize.Lg}
        testID={
          currentQuestionIndex === 1
            ? SrpSecurityQuestionOneSelectorsIDs.RIGHT_ANSWER
            : SrpSecurityQuestionTwoSelectorsIDs.WRONG_ANSWER
        }
        twClassName="w-full text-center"
      >
        {strings(
          currentQuestionIndex === 1
            ? 'srp_security_quiz.question_one.right_answer'
            : 'srp_security_quiz.question_two.wrong_answer',
        )}
      </Button>
      <TextButton
        onPress={onLearnMore}
        testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
        twClassName="w-full text-center flex items-center justify-center"
      >
        {strings('multichain_accounts.reveal_srp.learn_more')}
      </TextButton>
    </Box>
  );

  const renderAnsweredButtons = () => (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.End}
      justifyContent={BoxJustifyContent.End}
      twClassName="w-full flex-1"
      gap={4}
    >
      <Button
        variant={ButtonVariant.Primary}
        onPress={onContinueClick}
        size={ButtonSize.Lg}
        testID={
          correctAnswer
            ? currentQuestionIndex === 1
              ? SrpSecurityQuestionOneSelectorsIDs.RIGHT_CONTINUE
              : SrpSecurityQuestionTwoSelectorsIDs.RIGHT_CONTINUE
            : currentQuestionIndex === 1
              ? SrpSecurityQuestionOneSelectorsIDs.WRONG_ANSWER_TRY_AGAIN_BUTTON
              : SrpSecurityQuestionTwoSelectorsIDs.WRONG_ANSWER_TRY_AGAIN_BUTTON
        }
        twClassName="w-full text-center"
      >
        {strings(
          correctAnswer
            ? 'srp_security_quiz.continue'
            : 'srp_security_quiz.try_again',
        )}
      </Button>
      <TextButton
        onPress={onLearnMore}
        testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
        twClassName="w-full text-center flex items-center justify-center"
      >
        {strings('multichain_accounts.reveal_srp.learn_more')}
      </TextButton>
    </Box>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Start}
      justifyContent={BoxJustifyContent.Start}
      twClassName="w-full flex-1"
      paddingHorizontal={4}
      paddingTop={2}
      paddingBottom={6}
    >
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextAlternative}
        twClassName="mb-2"
      >
        {strings('srp_security_quiz.question_step', {
          step: currentQuestionIndex,
          total: 2,
        })}
      </Text>

      {questionAnswered && renderQuestionResult()}

      {!questionAnswered && (
        <Text
          variant={TextVariant.HeadingLg}
          color={TextColor.TextDefault}
          twClassName="w-[90%] mb-6"
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
