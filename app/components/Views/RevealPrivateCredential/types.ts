import { InternalAccount } from '@metamask/keyring-internal-api';
import { RouteProp, ParamListBase } from '@react-navigation/native';

export enum RevealSrpStage {
  Introduction = 'introduction',
  Quiz = 'quiz',
  ActionViewScreen = 'actionViewScreen',
}

export interface RootStackParamList extends ParamListBase {
  RevealPrivateCredential: {
    shouldUpdateNav?: boolean;
    selectedAccount?: InternalAccount;
    keyringId?: string;
  };
}

export type RevealPrivateCredentialRouteProp = RouteProp<
  RootStackParamList,
  'RevealPrivateCredential'
>;

export interface IRevealPrivateCredentialProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  cancel: () => void;
  route: RevealPrivateCredentialRouteProp;
  showCancelButton?: boolean;
}

export interface SRPQuizIntroductionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}

export interface SRPSecurityQuizProps {
  currentQuestionIndex: number;
  questionAnswered: boolean;
  correctAnswer: boolean;
  onAnswerClick: (buttonIndex: number) => void;
  onContinueClick: () => void;
  onLearnMore: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}

export interface SeedPhraseDisplayProps {
  words: string[];
  clipboardEnabled: boolean;
  onCopyToClipboard: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}

export interface SeedPhraseConcealerProps {
  onReveal: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}

export interface PasswordEntryProps {
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  warningMessage: string;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}
