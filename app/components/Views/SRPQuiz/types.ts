import { ButtonVariants } from '../../../component-library/components/Buttons/Button';

export enum QuizStage {
  introduction = 'introduction',
  questionOne = 'question-one',
  wrongAnswerQuestionOne = 'wrong-answer-questoin-one',
  rightAnswerQuestionOne = 'right-answer-questoin-one',
  questionTwo = 'question-two',
  wrongAnswerQuestionTwo = 'wrong-answer-questoin-two',
  rightAnswerQuestionTwo = 'right-answer-questoin-two',
}

export interface IQuizInformationProps {
  title: {
    content: string;
    style?: any;
  };
  buttons: {
    onPress: () => void;
    label: string;
    variant: ButtonVariants;
  }[];
  dismiss: () => void;
  header?: string;
  content?: string;
  icon?: any;
}

export interface Question {
  content: string;
  answers: Answer[];
}

export interface Answer {
  content: string;
  correct: boolean;
}
