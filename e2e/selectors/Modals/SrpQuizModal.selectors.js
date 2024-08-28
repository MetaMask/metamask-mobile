import enContent from '../../../locales/languages/en.json';

export const SrpQuizGetStartedModalSelectors = {
  IDs: {
    CONTAINER: 'quiz-get-started-modal',
    BUTTON: 'quiz-get-started-button',
    DISMISS: 'quiz-get-started-dismiss-button',
  },
  Text: {
    INTRODUCTION: enContent.srp_security_quiz.introduction,
  },
};

export const SrpSecurityQuestionOneModalSelectors = {
  IDs: {
    CONTAINER: 'srp-question-one-modal',
    DISMISS: 'srp-question-one-dismiss-button',
    WRONG_ANSWER: 'srp-question-one-wrong-answer',
    RIGHT_ANSWER: 'srp-question-one-right-answer',
    WRONG_ANSWER_TRY_AGAIN_BUTTON: 'srp-question-one-wrong-answer-try-again',
    RIGHT_CONTINUE: 'srp-question-one-right-continue',
  },
  Text: {
    QUESTION: enContent.srp_security_quiz.question_one.question,
    RIGHT_ANSWER_RESPONSE_DESCRIPTION:
      enContent.srp_security_quiz.question_one.right_answer_description,
    RIGHT_ANSWER_RESPONSE_TITLE:
      enContent.srp_security_quiz.question_one.right_answer_title,
    WRONG_ANSWER_RESPONSE_DESCRIPTION:
      enContent.srp_security_quiz.question_one.wrong_answer_description,
    WRONG_ANSWER_RESPONSE_TITLE:
      enContent.srp_security_quiz.question_one.wrong_answer_title,
  },
};

export const SrpSecurityQuestionTwoModalSelectors = {
  IDs: {
    CONTAINER: 'srp-question-two-modal',
    DISMISS: 'srp-question-two-dismiss-button',
    WRONG_ANSWER: 'srp-question-two-wrong-answer',
    RIGHT_ANSWER: 'srp-question-two-right-answer',
    WRONG_ANSWER_TRY_AGAIN_BUTTON: 'srp-question-two-wrong-answer-try-again',
    RIGHT_CONTINUE: 'srp-question-two-right-continue',
  },
  Text: {
    QUESTION: enContent.srp_security_quiz.question_two.question,
    RIGHT_ANSWER_RESPONSE_DESCRIPTION:
      enContent.srp_security_quiz.question_two.right_answer_description,
    RIGHT_ANSWER_RESPONSE_TITLE:
      enContent.srp_security_quiz.question_two.right_answer_title,
    WRONG_ANSWER_RESPONSE_DESCRIPTION:
      enContent.srp_security_quiz.question_two.wrong_answer_description,
    WRONG_ANSWER_RESPONSE_TITLE:
      enContent.srp_security_quiz.question_two.wrong_answer_title,
  },
};
