export enum SeedlessOnboardingControllerErrorType {
  UnknownError = 10101,
  AuthenticationError = 10102,
  ChangePasswordError = 10103,
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
} as const;

export class SeedlessOnboardingControllerError extends Error {
  public readonly code: SeedlessOnboardingControllerErrorType;

  constructor(
    errMessage: string | Error,
    code: SeedlessOnboardingControllerErrorType,
  ) {
    if (errMessage instanceof Error) {
      super(errMessage.message);
      this.stack = errMessage.stack;
      this.name = errMessage.name;
    } else {
      super(errMessage);
    }
    this.message = `${SeedlessOnboardingControllerErrorMessages[code]} - ${errMessage}`;
    this.code = code;
  }
}
