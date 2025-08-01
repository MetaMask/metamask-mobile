export enum SeedlessOnboardingControllerErrorType {
  UnknownError = 10101,
  AuthenticationError = 10102,
  ChangePasswordError = 10103,
  PasswordRecentlyUpdated = 10104,
}

export const SeedlessOnboardingControllerErrorMessages: Record<
  SeedlessOnboardingControllerErrorType,
  string
> = {
  [SeedlessOnboardingControllerErrorType.UnknownError]: 'Unknown error',
  [SeedlessOnboardingControllerErrorType.AuthenticationError]:
    'Authentication error',
  [SeedlessOnboardingControllerErrorType.ChangePasswordError]:
    'Change password error',
  [SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated]:
    'Password recently updated',
} as const;

export class SeedlessOnboardingControllerError extends Error {
  public readonly code: SeedlessOnboardingControllerErrorType;

  constructor(
    code: SeedlessOnboardingControllerErrorType,
    errMessage?: string | Error,
  ) {
    if (errMessage instanceof Error) {
      super(errMessage.message);
      this.stack = errMessage.stack;
      this.name = errMessage.name;
    } else {
      super(errMessage || SeedlessOnboardingControllerErrorMessages[code]);
    }
    this.message = `SeedlessOnboardingController- ${
      errMessage || SeedlessOnboardingControllerErrorMessages[code]
    }`;
    this.code = code;
  }
}
