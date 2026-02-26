const OTP_OPTION_PREFIX = 'account-approval-otp-option';

export const AccountApprovalSelectorsIDs = {
  getOtpOption: (value: string) => `${OTP_OPTION_PREFIX}-${value}`,
};
