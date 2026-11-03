/**
 * Whether `KycController.startSession` failed because the signed-in profile
 * has no verified email. The partner identity token request answered 422
 * (`email_required`) and no email was stored, so only the email step, which
 * verifies one, can open the session.
 *
 * @param error - The caught error.
 * @returns True for the missing verified email error.
 */
export const isMissingVerifiedEmailError = (error: unknown): boolean =>
  error instanceof Error &&
  error.message.includes('missing verified email for vendor');
