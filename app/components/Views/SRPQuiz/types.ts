export interface IQuizInformationProps {
  title: string;
  btnLabel: string;
  onContinuePress: () => void;
  header?: string;
  content?: string;
  icon?: any;
  styles?: any;
}

export interface Question {
  content: string;
  answers: Answer[];
}

export interface Answer {
  content: string;
  correct: boolean;
}
