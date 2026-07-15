export interface OnboardingCryptoExperienceQuestionnaireRouteParams {
  onComplete: () => void;
  accountType?: string;
}

export type CryptoExperienceLevel =
  | 'new'
  | 'beginner'
  | 'intermediate'
  | 'advanced';
