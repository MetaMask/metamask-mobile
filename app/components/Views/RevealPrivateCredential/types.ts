import { InternalAccount } from '@metamask/keyring-internal-api';
import { RouteProp, ParamListBase } from '@react-navigation/native';
import { createStyles } from './styles';

export enum RevealSrpStage {
  Introduction = 'introduction',
  Quiz = 'quiz',
  ActionViewScreen = 'actionViewScreen',
}

export type RevealPrivateCredentialStyleSheet = ReturnType<typeof createStyles>;

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  cancel: () => void;
  route: RevealPrivateCredentialRouteProp;
  showCancelButton?: boolean;
}

export interface SRPQuizIntroductionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
  styles: RevealPrivateCredentialStyleSheet;
}

export interface SRPSecurityQuizProps {
  currentQuestionIndex: number;
  questionAnswered: boolean;
  correctAnswer: boolean;
  onAnswerClick: (buttonIndex: number) => void;
  onContinueClick: () => void;
  onLearnMore: () => void;
  styles: RevealPrivateCredentialStyleSheet;
}

export interface SeedPhraseDisplayProps {
  words: string[];
  clipboardEnabled: boolean;
  onCopyToClipboard: () => void;
  styles: RevealPrivateCredentialStyleSheet;
}

export interface SeedPhraseConcealerProps {
  onReveal: () => void;
  styles: RevealPrivateCredentialStyleSheet;
}

export interface PasswordEntryProps {
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  warningMessage: string;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  styles: RevealPrivateCredentialStyleSheet;
}

export interface SRPTabViewProps {
  clipboardPrivateCredential: string;
  showSeedPhrase: boolean;
  clipboardEnabled: boolean;
  onRevealSeedPhrase: () => void;
  onCopyToClipboard: () => void;
  onTabChange: (event: { i: number }) => void;
  styles: RevealPrivateCredentialStyleSheet;
}
