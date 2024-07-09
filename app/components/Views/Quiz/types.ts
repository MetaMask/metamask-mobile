import { ImageSourcePropType } from 'react-native';
import { ButtonVariants } from '../../../component-library/components/Buttons/Button';

export enum QuizStage {
  introduction = 'introduction',
  questionOne = 'question-one',
  wrongAnswerQuestionOne = 'wrong-answer-question-one',
  rightAnswerQuestionOne = 'right-answer-question-one',
  questionTwo = 'question-two',
  wrongAnswerQuestionTwo = 'wrong-answer-question-two',
  rightAnswerQuestionTwo = 'right-answer-question-two',
}

export interface IQuizInformationProps {
  title: {
    content: string;
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    style?: any;
    testID?: string;
  };
  buttons: {
    onPress: () => void;
    label: string;
    variant: ButtonVariants;
    testID?: string;
  }[];
  dismiss: () => void;
  header?: string;
  image?: ImageSourcePropType;
  content?: string;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: any;
}
