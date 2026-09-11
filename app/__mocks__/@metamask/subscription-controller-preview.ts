export * from '../../../node_modules/@metamask/wallet/node_modules/@metamask/subscription-controller/dist/index.cjs';

/**
 * Lightweight Jest stand-in for the ESM-only preview service.
 *
 * Existing tests exercise the wallet-owned v8 controller. Service behavior is
 * covered at the mobile orchestration boundary without loading the preview's
 * full ESM dependency graph.
 */
export class SubscriptionDelegationService {
  readonly name = 'SubscriptionDelegationService';
}

export const SubscriptionDelegationServiceErrorMessage = {
  InsufficientBalance:
    'Money Account balance is insufficient for the subscription funding requirement',
} as const;
