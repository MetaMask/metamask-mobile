/* eslint-disable import/prefer-default-export */
import { strings } from '../../../../locales/i18n';

const headers = {
  introduction: strings('srp_security_quiz.title'),
  questionOne: `1 ${strings('srp_security_quiz.of')} 2`,
  questionTwo: `2 ${strings('srp_security_quiz.of')} 2`,
};

export const quiz = {
  introduction: {
    header: headers.introduction,
    title: strings('srp_security_quiz.introduction'),
  },
  questionOne: {
    header: headers.questionOne,
    content: strings('srp_security_quiz.question_one.question'),
    answers: {
      correct: strings('srp_security_quiz.question_one.right_answer'),
      incorrect: strings('srp_security_quiz.question_one.wrong_answer'),
    },
  },
  questionOneCorrectInformation: {
    header: headers.questionOne,
    title: strings('srp_security_quiz.question_one.right_answer_title'),
    description: strings(
      'srp_security_quiz.question_one.right_answer_description',
    ),
  },
  questionOneIncorrectInformation: {
    header: headers.questionOne,
    title: strings('srp_security_quiz.question_one.wrong_answer_title'),
    description: strings(
      'srp_security_quiz.question_one.wrong_answer_description',
    ),
  },
  questionTwo: {
    header: headers.questionTwo,
    content: strings('srp_security_quiz.question_one.question'),
    answers: {
      correct: strings('srp_security_quiz.question_two.right_answer'),
      incorrect: strings('srp_security_quiz.question_two.wrong_answer'),
    },
  },
  questionTwoCorrectInformation: {
    header: headers.questionTwo,
    title: strings('srp_security_quiz.question_two.right_answer_title'),
    description: strings(
      'srp_security_quiz.question_two.right_answer_description',
    ),
  },
  questionTwoIncorrectInformation: {
    header: headers.questionTwo,
    title: strings('srp_security_quiz.question_two.wrong_answer_title'),
    description: strings(
      'srp_security_quiz.question_two.wrong_answer_description',
    ),
  },
};
