import { ButtonVariants } from '../../../component-library/components/Buttons/Button';

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
