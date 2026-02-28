import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Order } from '@consensys/on-ramp-sdk';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import {
  setRampRoutingDecision,
  UnifiedRampRoutingType,
  getDetectedGeolocation,
} from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { RootState } from '../../../../reducers';
import { selectRampsOrders } from '../../../../selectors/rampsController';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';

/**
 * Checks if an aggregator order was placed through Transak provider.
 * For aggregator orders, the actual provider is stored in order.data.provider.id
 */
const isTransakAggregatorOrder = (order: FiatOrder): boolean => {
  if (order.provider !== FIAT_ORDER_PROVIDERS.AGGREGATOR) {
    return false;
  }
  const providerId = (order.data as Order)?.provider?.id;
  return (
    typeof providerId === 'string' &&
    providerId.toLowerCase().includes('transak')
  );
};

const RAMP_ELIGIBILITY_URLS = {
  STAGING: 'https://on-ramp-content.uat-api.cx.metamask.io',
  PRODUCTION: 'https://on-ramp-content.api.cx.metamask.io',
};

const getBaseUrl = () => {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;

  const isProductionEnvironment =
    metamaskEnvironment === 'production' ||
    metamaskEnvironment === 'beta' ||
    metamaskEnvironment === 'rc';

  return isProductionEnvironment
    ? RAMP_ELIGIBILITY_URLS.PRODUCTION
    : RAMP_ELIGIBILITY_URLS.STAGING;
};

export enum RampRegionSupport {
  DEPOSIT = 'DEPOSIT',
  AGGREGATOR = 'AGGREGATOR',
  UNSUPPORTED = 'UNSUPPORTED',
  ERROR = 'ERROR',
}

export interface RampEligibilityAPIResponse {
  deposit: boolean;
  aggregator: boolean;
  global: boolean;
}

const isTransakControllerOrder = (order: RampsOrder): boolean => {
  const providerId = order.provider?.id;
  return (
    typeof providerId === 'string' &&
    providerId.toLowerCase().includes('transak')
  );
};

/**
 * Returns the routing decision based on the most recent completed order from
 * both legacy Redux orders and controller V2 orders.
 */
function getRoutingFromOrders(
  legacyOrders: FiatOrder[],
  controllerOrders: RampsOrder[],
): UnifiedRampRoutingType {
  const completedLegacy = legacyOrders.filter(
    (order) => order.state === FIAT_ORDER_STATES.COMPLETED,
  );
  const completedV2 = controllerOrders.filter(
    (order) => order.status === RampsOrderStatus.Completed,
  );

  if (completedLegacy.length === 0 && completedV2.length === 0) {
    return UnifiedRampRoutingType.DEPOSIT;
  }

  let latestLegacyOrder: FiatOrder | undefined;
  if (completedLegacy.length > 0) {
    [latestLegacyOrder] = [...completedLegacy].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }

  let latestV2Order: RampsOrder | undefined;
  if (completedV2.length > 0) {
    [latestV2Order] = [...completedV2].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }

  const legacyTimestamp = latestLegacyOrder?.createdAt ?? 0;
  const v2Timestamp = latestV2Order?.createdAt ?? 0;

  if (latestV2Order && v2Timestamp >= legacyTimestamp) {
    return isTransakControllerOrder(latestV2Order)
      ? UnifiedRampRoutingType.DEPOSIT
      : UnifiedRampRoutingType.AGGREGATOR;
  }

  if (latestLegacyOrder) {
    return latestLegacyOrder.provider === FIAT_ORDER_PROVIDERS.DEPOSIT ||
      isTransakAggregatorOrder(latestLegacyOrder)
      ? UnifiedRampRoutingType.DEPOSIT
      : UnifiedRampRoutingType.AGGREGATOR;
  }

  return UnifiedRampRoutingType.DEPOSIT;
}

export default function useRampsSmartRouting() {
  const unifiedV1Enabled = useRampsUnifiedV1Enabled();
  const dispatch = useDispatch();
  const orders = useSelector((state: RootState) => state.fiatOrders.orders);
  const controllerOrders = useSelector(selectRampsOrders);
  const rampGeodetectedRegion = useSelector(getDetectedGeolocation);

  useEffect(() => {
    if (!unifiedV1Enabled) {
      return;
    }

    const initializeRampRoutingDecision = async () => {
      if (!rampGeodetectedRegion) {
        dispatch(setRampRoutingDecision(UnifiedRampRoutingType.ERROR));
        return;
      }

      try {
        const baseUrl = getBaseUrl();
        const url = new URL(
          `/regions/countries/${rampGeodetectedRegion}`,
          baseUrl,
        ).toString();
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch region eligibility: ${response.status} ${response.statusText}`,
          );
        }

        const eligibility: RampEligibilityAPIResponse = await response.json();

        if (!eligibility.global) {
          dispatch(setRampRoutingDecision(UnifiedRampRoutingType.UNSUPPORTED));
          return;
        }

        if (!eligibility.deposit) {
          dispatch(setRampRoutingDecision(UnifiedRampRoutingType.AGGREGATOR));
          return;
        }

        dispatch(
          setRampRoutingDecision(
            getRoutingFromOrders(orders, controllerOrders),
          ),
        );
      } catch (error) {
        dispatch(setRampRoutingDecision(UnifiedRampRoutingType.ERROR));
      }
    };

    initializeRampRoutingDecision();
  }, [
    rampGeodetectedRegion,
    orders,
    controllerOrders,
    unifiedV1Enabled,
    dispatch,
  ]);
}
