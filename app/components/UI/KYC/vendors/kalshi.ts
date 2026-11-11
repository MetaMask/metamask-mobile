/**
 * POC: Kalshi as a KYC vendor. The idOS relay registers the Kalshi user,
 * runs the email and phone codes and SumSub; the phone then links that user
 * to MetaMask with device-signed enrollment calls and activates it.
 */
export const KALSHI_KYC_VENDOR = {
  id: 'kalshi',
  loggerFeature: 'kalshi-kyc',
  /**
   * Kalshi demo checks the payout wallet against Stripe's sandbox and rejects
   * arbitrary addresses, so the demo activates with this USDC-on-Base wallet.
   */
  demoPayoutWallet: '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c',
  demoPayoutNetwork: 'base',
  /** Kalshi demo test values (spec Appendix A.4). */
  demoValues: {
    phone: '+18888888888',
    code: '888888',
  },
} as const;
