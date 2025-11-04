import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setRampRoutingDecision,
  RampRoutingType,
  getRampRegionSupport,
} from '../../../../reducers/fiatOrders';
import type { RootState } from '../../../../reducers';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import { RampRegionSupport } from '../../../../reducers/fiatOrders/types';

export default function useRampsSmartRouting() {
  const dispatch = useDispatch();
  const orders = useSelector((state: RootState) => state.fiatOrders.orders);
  const rampRegionSupport = useSelector(getRampRegionSupport);

  const determineRoutingDecision = useCallback(() => {
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
    determineRoutingDecision();
  }, [determineRoutingDecision]);
}
