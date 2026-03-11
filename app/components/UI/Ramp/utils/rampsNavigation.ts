import Routes from '../../../../constants/navigation/Routes';

export interface RampsOrderDetailsParams {
  orderId: string;
  showCloseButton?: boolean;
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
