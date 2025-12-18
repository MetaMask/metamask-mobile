import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Order } from '@consensys/on-ramp-sdk';
import {
  setRampRoutingDecision,
  UnifiedRampRoutingType,
  getDetectedGeolocation,
} from '../../../../reducers/fiatOrders';
import type { FiatOrder } from '../../../../reducers/fiatOrders/types';
import type { RootState } from '../../../../reducers';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';
import Logger from '../../../../util/Logger';

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

export default function useRampsSmartRouting() {
  const unifiedV1Enabled = useRampsUnifiedV1Enabled();
  const dispatch = useDispatch();
  const orders = useSelector((state: RootState) => state.fiatOrders.orders);
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

        const completedOrders = orders.filter(
          (order) => order.state === FIAT_ORDER_STATES.COMPLETED,
        );

        if (completedOrders.length === 0) {
          dispatch(setRampRoutingDecision(UnifiedRampRoutingType.DEPOSIT));
          return;
        }

        const [lastCompletedOrder] = [...completedOrders].sort(
          (a, b) => b.createdAt - a.createdAt,
        );

        if (
          lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.DEPOSIT ||
          isTransakAggregatorOrder(lastCompletedOrder)
        ) {
          dispatch(setRampRoutingDecision(UnifiedRampRoutingType.DEPOSIT));
        } else {
          dispatch(setRampRoutingDecision(UnifiedRampRoutingType.AGGREGATOR));
        }
      } catch (error) {
        Logger.error(error as Error);
        dispatch(setRampRoutingDecision(UnifiedRampRoutingType.ERROR));
      }
    };

    initializeRampRoutingDecision();
  }, [rampGeodetectedRegion, orders, unifiedV1Enabled, dispatch]);
}
