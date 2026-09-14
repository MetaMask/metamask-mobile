import type { KycSumSubLauncher } from '@metamask/kyc-controller';

/**
 * Placeholder SumSub launcher for disclaimer-only KycController wiring.
 *
 * TRAM-3978 only calls `loadDisclaimers`; SumSub SDK integration (native pods,
 * `@sumsub/react-native-mobilesdk-module`) belongs in a separate identity-flow
 * ticket. The controller requires a launcher at construction time, so we inject
 * a no-op adapter that fails fast if SumSub is invoked before real wiring lands.
 */
export const kycSumSubLauncherStub: KycSumSubLauncher = {
  isAvailable: () => false,

  launch: async () => {
    throw new Error('SumSub launcher is not wired on mobile yet');
  },
};
