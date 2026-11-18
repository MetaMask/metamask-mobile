/**
 * Kalshi as a KYC vendor. The phone creates or links the Kalshi account with
 * device-signed calls that pass through kyc-api, then kyc-api opens the UKYC
 * session and the idOS relay runs the email and phone codes, SumSub and
 * Kalshi's verification. Activation belongs to Predict.
 */
export const KALSHI_KYC_VENDOR = {
  id: 'kalshi',
  loggerFeature: 'kalshi-kyc',
  /** Kalshi demo test values (spec Appendix A.4), shown as hints. */
  demoValues: {
    phone: '+18888888888',
    code: '888888',
  },
} as const;
