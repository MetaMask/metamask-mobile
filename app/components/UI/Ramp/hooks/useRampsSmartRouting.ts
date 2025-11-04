import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setRampRoutingDecision,
  RampRoutingType,
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
  const [rampRegionSupport, setRampRegionSupport] =
    useState<RampRegionSupport | null>(null);

  useEffect(() => {
    if (!unifiedV1Enabled) {
      return;
    }

    const fetchRampEligibility = async () => {
      if (!rampGeodetectedRegion) {
        setRampRegionSupport(RampRegionSupport.UNSUPPORTED);
        return;
      }

      try {
        // TODO: Remove this once the API is ready and use the actual API route instead
        const response = await fetch(
          `/endpoint-coming-soon?region=${rampGeodetectedRegion}`,
        );
        const data: RampEligibilityAPIResponse = await response.json();

        if (!data.global) {
          setRampRegionSupport(RampRegionSupport.UNSUPPORTED);
        } else if (!data.deposit) {
          setRampRegionSupport(RampRegionSupport.AGGREGATOR);
        } else {
          setRampRegionSupport(RampRegionSupport.DEPOSIT);
        }
      } catch (error) {
        setRampRegionSupport(RampRegionSupport.UNSUPPORTED);
      }
    };

    fetchRampEligibility();
  }, [rampGeodetectedRegion, unifiedV1Enabled]);

  const determineRoutingDecision = useCallback(() => {
    if (rampRegionSupport === null) {
      return;
    }

    if (rampRegionSupport === RampRegionSupport.UNSUPPORTED) {
      dispatch(setRampRoutingDecision(RampRoutingType.UNSUPPORTED));
      return;
    }

    if (rampRegionSupport === RampRegionSupport.AGGREGATOR) {
      dispatch(setRampRoutingDecision(RampRoutingType.AGGREGATOR));
      return;
    }

    const completedOrders = orders.filter(
      (order) => order.state === FIAT_ORDER_STATES.COMPLETED,
    );

    if (completedOrders.length === 0) {
      dispatch(setRampRoutingDecision(RampRoutingType.DEPOSIT));
      return;
    }

    const sortedOrders = [...completedOrders].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
    const lastCompletedOrder = sortedOrders[0];

    if (lastCompletedOrder.provider === FIAT_ORDER_PROVIDERS.TRANSAK) {
      dispatch(setRampRoutingDecision(RampRoutingType.DEPOSIT));
    } else {
      dispatch(setRampRoutingDecision(RampRoutingType.AGGREGATOR));
    }
  }, [dispatch, orders, rampRegionSupport]);

  useEffect(() => {
    if (!unifiedV1Enabled) {
      return;
    }

    determineRoutingDecision();
  }, [determineRoutingDecision, unifiedV1Enabled]);
}
