import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setRampRoutingDecision,
  UnifiedRampRoutingType,
  getDetectedGeolocation,
} from '../../../../reducers/fiatOrders';
import type { RootState } from '../../../../reducers';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import useRampsUnifiedV1Enabled from './useRampsUnifiedV1Enabled';

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
        const response = await fetch(
          `/endpoint-coming-soon?region=${rampGeodetectedRegion}`,
        );
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

        const sortedOrders = [...completedOrders].sort(
          (a, b) => b.createdAt - a.createdAt,
        );
        const lastCompletedOrder = sortedOrders[0];

        if (lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.TRANSAK) {
          dispatch(setRampRoutingDecision(UnifiedRampRoutingType.DEPOSIT));
        } else {
          dispatch(setRampRoutingDecision(UnifiedRampRoutingType.AGGREGATOR));
        }
      } catch (error) {
        dispatch(setRampRoutingDecision(UnifiedRampRoutingType.ERROR));
      }
    };

    initializeRampRoutingDecision();
  }, [rampGeodetectedRegion, orders, unifiedV1Enabled, dispatch]);
}
