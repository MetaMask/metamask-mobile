import { RouteProp } from '@react-navigation/native';
import type { RevealPrivateCredentialParams } from './RevealPrivateCredential.types';

export enum RevealSrpStage {
  Introduction = 'introduction',
  Quiz = 'quiz',
  ActionViewScreen = 'actionViewScreen',
}

/** Route prop for RevealPrivateCredential screen; params come from canonical RevealPrivateCredentialParams. */
export type RevealPrivateCredentialRouteProp = RouteProp<
  { RevealPrivateCredential: RevealPrivateCredentialParams },
  'RevealPrivateCredential'
>;

export interface IRevealPrivateCredentialProps {
  /** When omitted or null, e.g. outside NavigationContainer, "Learn more" nav is a no-op. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation?: any;
  cancel: () => void;
  route: RevealPrivateCredentialRouteProp;
  showCancelButton?: boolean;
}

export interface SRPQuizIntroductionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

export interface SRPSecurityQuizProps {
  currentQuestionIndex: number;
  questionAnswered: boolean;
  correctAnswer: boolean;
  onAnswerClick: (buttonIndex: number) => void;
  onContinueClick: () => void;
  onLearnMore: () => void;
}

export interface SeedPhraseDisplayProps {
  words: string[];
  showSeedPhrase: boolean;
  clipboardEnabled: boolean;
  onCopyToClipboard: () => void;
}

export interface SeedPhraseConcealerProps {
  onReveal: () => void;
  testID?: string;
}

export interface PasswordEntryProps {
  password: string;
  onPasswordChange: (password: string) => void;
  onSubmit: () => void;
  warningMessage: string;
  showPassword: boolean;
  onToggleShowPassword: () => void;
}

export interface SRPTabViewProps {
  clipboardPrivateCredential: string;
  showSeedPhrase: boolean;
  clipboardEnabled: boolean;
  onRevealSeedPhrase: () => void;
  onCopyToClipboard: () => void;
  onTabChange: (event: { i: number }) => void;
}
