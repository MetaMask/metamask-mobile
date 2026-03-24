import Routes from '../../../../constants/navigation/Routes';

export interface RampsOrderDetailsParams {
  orderId?: string;
  showCloseButton?: boolean;
  callbackUrl?: string;
  providerCode?: string;
  walletAddress?: string;
}

export function createRampsOrderDetailsRoute(params: RampsOrderDetailsParams): {
  name: string;
  params: RampsOrderDetailsParams;
} {
  return {
    name: Routes.RAMP.RAMPS_ORDER_DETAILS,
    params,
  };
}

export function createBuildQuoteRoute(): {
  name: string;
  params: Record<string, never>;
} {
  return { name: Routes.RAMP.BUILD_QUOTE, params: {} };
}

export type NavigateAfterExternalBrowserOpts =
  | { returnDestination: 'buildQuote' }
  | {
      returnDestination: 'order';
      orderCode: string;
      providerCode: string;
      walletAddress?: string;
    }
  | {
      returnDestination: 'order';
      callbackUrl: string;
      providerCode: string;
      walletAddress: string;
    };

/**
 * Returns the routes array for navigation.reset() when returning from an
 * external browser (e.g. InAppBrowser, system browser). Used by BuildQuote
 * after widget checkout flows (PayPal, Moonpay, etc.).
 */
export function getNavigateAfterExternalBrowserRoutes(
  opts: NavigateAfterExternalBrowserOpts,
): (
  | ReturnType<typeof createBuildQuoteRoute>
  | ReturnType<typeof createRampsOrderDetailsRoute>
)[] {
  if (opts.returnDestination === 'order') {
    if ('callbackUrl' in opts) {
      return [
        createRampsOrderDetailsRoute({
          callbackUrl: opts.callbackUrl,
          providerCode: opts.providerCode,
          walletAddress: opts.walletAddress,
          showCloseButton: true,
        }),
      ];
    }
    return [
      createRampsOrderDetailsRoute({
        orderId: opts.orderCode,
        showCloseButton: true,
      }),
    ];
  }
  return [createBuildQuoteRoute()];
}
