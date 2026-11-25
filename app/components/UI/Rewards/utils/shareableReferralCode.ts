/**
 * Whether the user holds a referral code they can hand out: the code is
 * active and not empty. A pending, inactive, revoked or missing code is not
 * shareable. Every share entry point on the Money dashboard reads this one
 * rule, so none offers a share sheet with no usable code.
 *
 * `referralCodeStatus` is the referrer's own code status. It wins over the
 * status on the code itself when both are present.
 */
export function isShareableReferralCode(
  referralCode:
    | { code?: string | null; status?: string | null }
    | null
    | undefined,
  referralCodeStatus: string | null | undefined,
): boolean {
  const code = referralCode?.code?.trim() ?? '';
  const codeStatus = referralCodeStatus ?? referralCode?.status;
  return codeStatus === 'ACTIVE' && code.length > 0;
}
