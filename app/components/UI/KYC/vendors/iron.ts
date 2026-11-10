import { getVbaCufLifecycleContext } from '../../Ramp/Views/VirtualBankAccount/vbaCufLifecycle';

/**
 * Iron, the only vendor the KYC module serves today.
 *
 * Analytics names stay on the values the virtual bank account funnel already
 * sends, so existing dashboards keep joining. `vendor` is the schema value
 * `moonpay`; the controller's own vendor id remains `iron`.
 *
 * Screen traces still read the bank-account flow's shared lifecycle context,
 * so a KYC screen opened inside that journey reports the same
 * `lifecycle_context` as the rest of it.
 */
export const IRON_KYC_VENDOR = {
  id: 'iron',
  analytics: {
    screenName: 'vba_onboarding',
    entryPoint: 'add_funds_bank_account',
    vendor: 'moonpay',
    provider: 'sumsub',
  },
  trace: {
    flow: 'vba',
    lifecycleContextTag: 'lifecycle_context',
    getLifecycleContext: getVbaCufLifecycleContext,
  },
  loggerFeature: 'vba-kyc',
} as const;
