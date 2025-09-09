export interface OnboardingSheetParams {
  onPressCreate?: () => void;
  onPressImport?: () => void;
  onPressContinueWithGoogle?: (createWallet: boolean) => void;
  onPressContinueWithApple?: (createWallet: boolean) => void;
  createWallet?: boolean;
}
