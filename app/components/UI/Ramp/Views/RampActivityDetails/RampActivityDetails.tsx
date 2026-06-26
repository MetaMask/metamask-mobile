import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { getOrderById } from '../../../../../reducers/fiatOrders';
import type { RootState } from '../../../../../reducers';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { RampActivityDetailsContent } from './RampActivityDetailsContent';

export interface RampActivityDetailsParams {
  orderId?: string;
}

export const createRampActivityDetailsNavDetails =
  createNavigationDetails<RampActivityDetailsParams>(
    Routes.RAMP.RAMP_ACTIVITY_DETAILS,
  );

export default function RampActivityDetails() {
  const params = useParams<RampActivityDetailsParams>();
  const navigation = useNavigation();
  const order = useSelector((state: RootState) =>
    getOrderById(state, params.orderId),
  );

  useEffect(() => {
    if (!order) {
      navigation.goBack();
    }
  }, [navigation, order]);

  if (!order) {
    return null;
  }

  return <RampActivityDetailsContent order={order} />;
}
